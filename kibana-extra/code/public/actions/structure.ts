/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';

export const loadStructure = createAction<string>('LOAD STRUCTURE');
export const loadStructureSuccess = createAction<ResponseMessage>('LOAD STRUCTURE SUCCESS');
export const loadStructureFailed = createAction<Error>('LOAD STRUCTURE FAILED');
