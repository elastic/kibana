/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { ScoutLogger } from '../../../../common/services';
import { coreWorkerFixtures } from './core_fixtures';

interface UserProfileActivationResult {
  uid: string;
  enabled: boolean;
  user: {
    username: string;
    roles: string[];
    realm_name: string;
    email?: string;
    full_name?: string;
  };
}

export interface UserProfilesFixture {
  /**
   * Activates a user profile for the specified user credentials.
   * This ensures the user has a profile_uid which is required for some Kibana features
   * like the Elastic AI Assistant.
   *
   * @param username - The username to activate
   * @param password - The user's password
   * @returns Promise resolving to the activated user profile
   */
  activateUserProfile: (username: string, password: string) => Promise<UserProfileActivationResult>;

  /**
   * Activates user profiles for common test users (elastic, kibana_system).
   * Call this during test setup to ensure test users have profiles activated.
   */
  activateCommonTestUsers: () => Promise<void>;
}

/**
 * Activates a user profile using password grant type.
 * This is essential for features that rely on user.profile_uid,
 * such as the Elastic AI Assistant.
 */
async function activateProfile(
  esClient: Client,
  log: ScoutLogger,
  username: string,
  password: string
): Promise<UserProfileActivationResult> {
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 150;

  log.debug(`Activating user profile for "${username}"`);

  let retriesLeft = MAX_RETRIES;
  while (retriesLeft > 0) {
    try {
      const response = await esClient.security.activateUserProfile({
        grant_type: 'password',
        username,
        password,
      });

      log.debug(
        `Successfully activated profile for "${response.user.username}" (uid: ${response.uid})`
      );

      return {
        uid: response.uid,
        enabled: response.enabled ?? true,
        user: {
          username: response.user.username,
          roles: response.user.roles,
          realm_name: response.user.realm_name,
          email: response.user.email ?? undefined,
          full_name: response.user.full_name ?? undefined,
        },
      };
    } catch (err) {
      // Handle version conflict (409) - retry with backoff
      if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 409) {
        retriesLeft--;
        if (retriesLeft === 0) {
          log.error(`Failed to activate profile for "${username}" after ${MAX_RETRIES} retries`);
          throw err;
        }

        const delay = (MAX_RETRIES - retriesLeft) * RETRY_DELAY_MS;
        log.debug(
          `Profile activation conflict for "${username}", retrying in ${delay}ms (${retriesLeft} retries left)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        log.error(`Failed to activate profile for "${username}": ${err}`);
        throw err;
      }
    }
  }

  throw new Error(`Failed to activate user profile for "${username}", max retries exceeded`);
}

/**
 * The userProfilesFixture provides utilities for activating user profiles in Elasticsearch.
 * This is crucial for tests that interact with features requiring profile_uid, such as:
 * - Elastic AI Assistant (conversations, prompts)
 * - User-scoped saved objects
 * - Collaboration features
 */
export const userProfilesFixture = coreWorkerFixtures.extend<
  {},
  { userProfiles: UserProfilesFixture }
>({
  userProfiles: [
    async ({ esClient, config, log }, use) => {
      const activateUserProfile = async (username: string, password: string) => {
        return activateProfile(esClient, log, username, password);
      };

      const activateCommonTestUsers = async () => {
        // Activate the main test user (typically 'elastic')
        try {
          await activateProfile(esClient, log, config.auth.username, config.auth.password);
        } catch (err) {
          log.debug(`Failed to activate profile for ${config.auth.username}: ${err}`);
        }

        // Note: SAML users (elastic_admin, elastic_viewer, elastic_editor, etc.) cannot be
        // activated via password grant type. They are auto-activated by Kibana on first
        // authenticated request through SAML flow.
      };

      log.serviceLoaded('userProfiles');
      await use({
        activateUserProfile,
        activateCommonTestUsers,
      });
    },
    { scope: 'worker' },
  ],
});
