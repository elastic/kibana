/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AclWarning, CanonicalAcl } from '@kbn/access-control';
import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';

/**
 * Options for {@link SavedObjectsClientContract.changeAcl}.
 *
 * @public
 */
export interface SavedObjectsChangeAclOptions extends SavedObjectsBaseOptions {
  /**
   * Version of the object the change was prepared against. The change fails with a conflict when
   * the object changed since.
   */
  version: string;
  /** The Elasticsearch refresh setting for this operation. Defaults to `wait_for`. */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 * Result of {@link SavedObjectsClientContract.changeAcl}.
 *
 * @public
 */
export interface SavedObjectsChangeAclResponse {
  type: string;
  id: string;
  /** New version of the object. */
  version: string;
  acl: CanonicalAcl;
  /** Recipients whose grants are stored but limited by their current feature privileges. */
  warnings: AclWarning[];
}
