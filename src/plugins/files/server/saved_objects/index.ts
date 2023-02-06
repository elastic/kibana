/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fileObjectType } from './file';
import { fileShareObjectType } from './file_share';

export const hiddenTypes = [fileObjectType.name, fileShareObjectType.name];
export { fileObjectType, fileShareObjectType };
