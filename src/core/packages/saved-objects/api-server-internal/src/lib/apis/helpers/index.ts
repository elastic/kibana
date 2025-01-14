/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICommonHelper } from './common';
import type { IEncryptionHelper } from './encryption';
import type { IValidationHelper } from './validation';
import type { IPreflightCheckHelper } from './preflight_check';
import type { ISerializerHelper } from './serializer';
import type { IMigrationHelper } from './migration';
import type { UserHelper } from './user';

export { CommonHelper, type ICommonHelper } from './common';
export { EncryptionHelper, type IEncryptionHelper } from './encryption';
export { ValidationHelper, type IValidationHelper } from './validation';
export { SerializerHelper, type ISerializerHelper } from './serializer';
export { MigrationHelper, type IMigrationHelper } from './migration';
export { UserHelper } from './user';
export {
  PreflightCheckHelper,
  type IPreflightCheckHelper,
  type PreflightCheckNamespacesParams,
  type PreflightCheckNamespacesResult,
  type PreflightDocParams,
  type PreflightDocResult,
  type PreflightNSParams,
  type PreflightNSResult,
} from './preflight_check';

export interface RepositoryHelpers {
  common: ICommonHelper;
  encryption: IEncryptionHelper;
  validation: IValidationHelper;
  preflight: IPreflightCheckHelper;
  serializer: ISerializerHelper;
  migration: IMigrationHelper;
  user: UserHelper;
}
