/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
import type { StorageContextGetTransformFn } from '../core';
export declare const disableCache: () => void;
/**
 * Wrap the "getContentManagementServicesTransforms()" handler from the @kbn/object-versioning package
 * to be able to cache the service definitions compilations so we can reuse them accross request as the
 * services definitions won't change until a new Elastic version is released. In which case the cache
 * will be cleared.
 *
 * @param contentTypeId The content type id for the service definition
 * @returns A "getContentManagementServicesTransforms()"
 */
export declare const getServiceObjectTransformFactory: (
  contentTypeId: string,
  _requestVersion: Version
) => StorageContextGetTransformFn;
