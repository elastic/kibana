/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { FileTree } from '../../model';
import { CommitInfo, ReferenceInfo } from '../../model/commit';

export interface FetchRepoPayload {
  uri: string;
}

export interface FetchRepoPayloadWithRevision extends FetchRepoPayload {
  revision: string;
}

export interface FetchRepoTreePayload extends FetchRepoPayloadWithRevision {
  path: string;
  depth?: number;
}

export const fetchRepoTree = createAction<FetchRepoTreePayload>('FETCH REPO TREE');
export const fetchRepoTreeSuccess = createAction<FileTree>('FETCH REPO TREE SUCCESS');
export const fetchRepoTreeFailed = createAction<Error>('FETCH REPO TREE FAILED');
export const closeTreePath = createAction<string>('CLOSE TREE PATH');
export const openTreePath = createAction<string>('OPEN TREE PATH');

export const fetchRepoBranches = createAction<FetchRepoPayload>('FETCH REPO BRANCHES');
export const fetchRepoBranchesSuccess = createAction<ReferenceInfo[]>(
  'FETCH REPO BRANCHES SUCCESS'
);
export const fetchRepoBranchesFailed = createAction<Error>('FETCH REPO BRANCHES FAILED');
export const fetchRepoCommits = createAction<FetchRepoPayloadWithRevision>('FETCH REPO COMMITS');
export const fetchRepoCommitsSuccess = createAction<CommitInfo[]>('FETCH REPO COMMITS SUCCESS');
export const fetchRepoCommitsFailed = createAction<Error>('FETCH REPO COMMITS FAILED');
