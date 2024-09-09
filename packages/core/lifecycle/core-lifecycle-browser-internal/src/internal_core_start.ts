/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalInjectedMetadataStart } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { InternalSecurityServiceStart } from '@kbn/core-security-browser-internal';
import type { InternalUserProfileServiceStart } from '@kbn/core-user-profile-browser-internal';

/** @internal */
export interface InternalCoreStart
  extends Omit<CoreStart, 'application' | 'plugins' | 'http' | 'security' | 'userProfile'> {
  application: InternalApplicationStart;
  injectedMetadata: InternalInjectedMetadataStart;
  http: InternalHttpStart;
  security: InternalSecurityServiceStart;
  userProfile: InternalUserProfileServiceStart;
}
