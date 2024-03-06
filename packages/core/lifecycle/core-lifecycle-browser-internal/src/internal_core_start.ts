/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalInjectedMetadataStart } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { InternalSecurityServiceStart } from '@kbn/core-security-browser-internal';

/** @internal */
export interface InternalCoreStart
  extends Omit<CoreStart, 'application' | 'plugins' | 'http' | 'security'> {
  application: InternalApplicationStart;
  injectedMetadata: InternalInjectedMetadataStart;
  http: InternalHttpStart;
  security: InternalSecurityServiceStart;
}
