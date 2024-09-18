/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { InternalApplicationSetup } from '@kbn/core-application-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { InternalSecurityServiceSetup } from '@kbn/core-security-browser-internal';
import type { InternalUserProfileServiceSetup } from '@kbn/core-user-profile-browser-internal';

/** @internal */
export interface InternalCoreSetup
  extends Omit<
    CoreSetup,
    'application' | 'plugins' | 'getStartServices' | 'http' | 'security' | 'userProfile'
  > {
  application: InternalApplicationSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
  http: InternalHttpSetup;
  security: InternalSecurityServiceSetup;
  userProfile: InternalUserProfileServiceSetup;
}
