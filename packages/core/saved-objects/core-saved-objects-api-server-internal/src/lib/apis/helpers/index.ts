/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ICommonHelper } from './common';
import type { IEncryptionHelper } from './encryption';
import type { IValidationHelper } from './validation';
import type { IPreflightCheckHelper } from './preflight_check';
import type { ISerializerHelper } from './serializer';

export { CommonHelper } from './common';
export { EncryptionHelper } from './encryption';
export { ValidationHelper } from './validation';
export { SerializerHelper } from './serializer';
export {
  PreflightCheckHelper,
  type PreflightCheckNamespacesParams,
  type PreflightCheckNamespacesResult,
} from './preflight_check';

export interface RepositoryHelpers {
  common: ICommonHelper;
  encryption: IEncryptionHelper;
  validation: IValidationHelper;
  preflight: IPreflightCheckHelper;
  serializer: ISerializerHelper;
}
