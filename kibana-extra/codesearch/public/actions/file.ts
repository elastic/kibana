/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { FileTree } from '../../model';

export interface FetchRepoTreePayload {
  uri: string;
  revision: string;
  path: string;
  depth?: number;
}
export const fetchRepoTree = createAction<FetchRepoTreePayload>('FETCH REPO TREE');
export const fetchRepoTreeSuccess = createAction<FileTree>('FETCH REPO TREE SUCCESS');
export const fetchRepoTreeFailed = createAction<Error>('FETCH REPO TREE FAILED');
export const closeTreePath = createAction<string>('CLOSE TREE PATH');
export const openTreePath = createAction<string>('OPEN TREE PATH');
