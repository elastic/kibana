/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SecurityCredentialManagedBy } from '@elastic/elasticsearch/lib/api/types';
import type { AuthenticationProvider } from './authentication_provider';
import type { User } from './user';

/**
 * An Elasticsearch realm that was used to resolve and authenticate the user.
 */
export interface UserRealm {
  /**
   * Arbitrary name of the security realm.
   */
  name: string;

  /**
   * Type of the security realm (file, native, saml etc.).
   */
  type: string;
}

/**
 * Represents the metadata of an API key.
 */
export interface ApiKeyDescriptor {
  /**
   *  Name of the API key.
   */
  name: string;

  /**
   * The ID of the API key.
   */
  id: string;

  /**
   * Which entity manages this API key
   */
  managed_by: SecurityCredentialManagedBy;
}

/**
 * Represents the currently authenticated user.
 */
export interface AuthenticatedUser extends User {
  /**
   * The name and type of the Realm that has authenticated the user.
   */
  authentication_realm: UserRealm;

  /**
   * The name and type of the Realm where the user information were retrieved from.
   */
  lookup_realm: UserRealm;

  /**
   * The authentication provider that used to authenticate user.
   */
  authentication_provider: AuthenticationProvider;

  /**
   * The AuthenticationType used by ES to authenticate the user.
   *
   * @example "realm" | "api_key" | "token" | "anonymous" | "internal"
   */
  authentication_type: string;

  /**
   * Indicates whether user is authenticated via Elastic Cloud built-in SAML realm.
   */
  elastic_cloud_user: boolean;

  /**
   * User profile ID of this user.
   */
  profile_uid?: string;

  /**
   * Indicates whether user is an operator.
   */
  operator?: boolean;

  /**
   * Metadata of the API key that was used to authenticate the user.
   */
  api_key?: ApiKeyDescriptor;

  /**
   * The HTTP Authorization scheme used to authenticate the user, set by the HTTP
   * authentication provider (`HTTPAuthenticationProvider`).
   * `null` when authentication does not use an Authorization header
   * (session-cookie, PKI, SAML, etc).
   *
   * Must be lowercase.
   *
   * Not to be confused with `BaseAuthenticationProvider.getHTTPAuthenticationScheme()`, which
   * describes the scheme a provider attaches to outbound requests to Elasticsearch — this field
   * describes the inbound client request instead.
   *
   * @example "apikey" | "bearer" | "basic"
   */
  http_authentication_scheme: string | null;
}

/**
 * Whether the user is anonymous, i.e. was authenticated via the `anonymous` authentication
 * provider.
 */
export function isUserAnonymous(user: Pick<AuthenticatedUser, 'authentication_provider'>) {
  return user.authentication_provider.type === 'anonymous';
}

/**
 * All users are supposed to have profiles except anonymous users and users authenticated
 * via authentication HTTP proxies.
 * @param user Authenticated user information.
 */
export function canUserHaveProfile(user: Pick<AuthenticatedUser, 'authentication_provider'>) {
  return !isUserAnonymous(user) && user.authentication_provider.type !== 'http';
}
