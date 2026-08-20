/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * How a background search's lifetime propagates to the Elasticsearch async searches it groups:
 * an unsaved session keeps them short-lived, saving the session extends them, extending the
 * session extends them again, and deleting the session deletes them.
 *
 * Also covers the "late-joiner" contract: a search submitted after a session's existing tracked
 * searches have already completed in Elasticsearch (e.g. an "other bucket" follow-up fired by
 * Lens during a session restore) must still be recorded in the session's idMapping.
 *
 * These assertions are all about backend state — the keep-alive Kibana asks Elasticsearch for —
 * so they belong here rather than in a UI spec.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  SESSION_API_PATH,
  ESE_API_PATH,
  COMMON_HEADERS,
  waitFor,
  randomSessionId,
  randomHash,
} from '../fixtures';

const ONE_MINUTE_MS = 60_000;

apiTest.describe(
  'search session - searches integration (stateful only)',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    /**
     * Submits a search under `sessionId` and returns the Elasticsearch async search id.
     * `wait_for_completion_timeout: '1ms'` guarantees the search is still running when it
     * returns, so it has an id to track.
     */
    const submitSearch = async (
      apiClient: ApiClientFixture,
      sessionId: string,
      { isStored }: { isStored?: boolean } = {}
    ): Promise<string> => {
      const response = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          ...(isStored ? { isStored: true } : {}),
          params: {
            body: { query: { match_all: {} } },
            wait_for_completion_timeout: '1ms',
          },
          requestHash: randomHash(),
        },
      });

      expect(response).toHaveStatusCode(200);
      return response.body.id;
    };

    const saveSession = async (apiClient: ApiClientFixture, sessionId: string) => {
      const response = await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });
      expect(response).toHaveStatusCode(200);
    };

    apiTest(
      'keeps an unsaved session short-lived and extends it once the session is saved and extended',
      async ({ apiClient, esClient }) => {
        const sessionId = randomSessionId();

        const unsavedSearchId = await submitSearch(apiClient, sessionId);
        const unsavedStatus = await esClient.asyncSearch.status({ id: unsavedSearchId });
        expect(unsavedStatus.expiration_time_in_millis).toBeLessThan(Date.now() + ONE_MINUTE_MS);

        await saveSession(apiClient, sessionId);

        const storedSearchId = await submitSearch(apiClient, sessionId, { isStored: true });
        // Kibana extends the keep-alive asynchronously once the search is tracked by the session.
        await waitFor(
          async () => {
            const status = await esClient.asyncSearch.status({ id: storedSearchId });
            return (status.expiration_time_in_millis ?? 0) > Date.now() + ONE_MINUTE_MS;
          },
          true,
          { timeout: 30_000 }
        );

        const afterSave = await esClient.asyncSearch.status({ id: storedSearchId });

        const extendResponse = await apiClient.post(`${SESSION_API_PATH}/${sessionId}/_extend`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          // Far enough out that the resulting keep-alive is unambiguously longer.
          body: { expires: new Date(Date.now() + 7 * 24 * 60 * ONE_MINUTE_MS).toISOString() },
        });
        expect(extendResponse).toHaveStatusCode(200);

        await waitFor(
          async () => {
            const status = await esClient.asyncSearch.status({ id: storedSearchId });
            return (
              (status.expiration_time_in_millis ?? 0) > (afterSave.expiration_time_in_millis ?? 0)
            );
          },
          true,
          { timeout: 30_000 }
        );
      }
    );

    apiTest(
      'deletes the async searches it grouped when the session is deleted',
      async ({ apiClient, esClient }) => {
        const sessionId = randomSessionId();

        await saveSession(apiClient, sessionId);
        const searchId = await submitSearch(apiClient, sessionId, { isStored: true });

        // Only searches the session has actually tracked get cleaned up with it.
        await waitFor(
          async () => {
            const session = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
              headers: { ...COMMON_HEADERS, ...cookieHeader },
            });
            if (session.statusCode !== 200) return false;
            const trackedIds = Object.values<{ id: string }>(session.body.attributes.idMapping).map(
              ({ id }) => id
            );
            return trackedIds.includes(searchId);
          },
          true,
          { timeout: 30_000 }
        );

        const deleteResponse = await apiClient.delete(`${SESSION_API_PATH}/${sessionId}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });
        expect(deleteResponse).toHaveStatusCode(200);

        await waitFor(
          async () => {
            const error = await esClient.asyncSearch
              .status({ id: searchId })
              .then(() => undefined)
              .catch((e) => e);
            return error?.meta?.body?.error?.type === 'resource_not_found_exception';
          },
          true,
          { timeout: 30_000 }
        );
      }
    );

    apiTest(
      "records a search submitted after the session's existing searches have already completed",
      async ({ apiClient, esClient }) => {
        const sessionId = randomSessionId();

        await saveSession(apiClient, sessionId);
        const firstId = await submitSearch(apiClient, sessionId, { isStored: true });

        // Wait for the first ES async search to finish — modelling the state where all of a
        // session's tracked searches are done, but a follow-up (e.g. an "other bucket" filter
        // request emitted by Lens after it processes the first result) is about to be issued.
        await waitFor(
          async () => !(await esClient.asyncSearch.status({ id: firstId })).is_running,
          true,
          { timeout: 30_000 }
        );

        // Also wait for Kibana to have recorded the first search in idMapping, so we can
        // distinguish "first tracked" from "second tracked" in the assertion below.
        await waitFor(
          async () => {
            const session = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
              headers: { ...COMMON_HEADERS, ...cookieHeader },
            });
            if (session.statusCode !== 200) return false;
            const ids = Object.values<{ id: string }>(session.body.attributes.idMapping).map(
              ({ id }) => id
            );
            return ids.includes(firstId);
          },
          true,
          { timeout: 30_000 }
        );

        // Submit the follow-up after the first search is done. The session engine must accept
        // and track it even though its existing search has already completed.
        const secondId = await submitSearch(apiClient, sessionId, { isStored: true });

        await waitFor(
          async () => {
            const session = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
              headers: { ...COMMON_HEADERS, ...cookieHeader },
            });
            if (session.statusCode !== 200) return false;
            const ids = Object.values<{ id: string }>(session.body.attributes.idMapping).map(
              ({ id }) => id
            );
            return ids.includes(secondId);
          },
          true,
          { timeout: 30_000 }
        );
      }
    );
  }
);
