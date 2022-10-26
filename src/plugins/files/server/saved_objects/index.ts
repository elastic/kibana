/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fileObjectType } from './file';
import { fileShareObjectType } from './file_share';

export const hiddenTypes = [fileObjectType.name, fileShareObjectType.name];
export { fileObjectType, fileShareObjectType };
