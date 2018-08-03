/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

import { Repository } from '../../model';

export const increase = createAction<number>('INCREASE');
export const decrease = createAction<number>('DECREASE');

export const fetchRepos = createAction('FETCH REPOS');
export const fetchReposSuccess = createAction<Repository[]>('FETCH REPOS SUCCESS');
export const fetchReposFailed = createAction<Error>('FETCH REPOS FAILED');

export const deleteRepo = createAction<string>('DELETE REPOS');
export const deleteRepoSuccess = createAction<string>('DELETE REPOS SUCCESS');
export const deleteRepoFailed = createAction<Error>('DELETE REPOS FAILED');

export const indexRepo = createAction<string>('INDEX REPOS');
export const indexRepoSuccess = createAction<string>('INDEX REPOS SUCCESS');
export const indexRepoFailed = createAction<Error>('INDEX REPOS FAILED');

export const importRepo = createAction<string>('IMPORT REPOS');
export const importRepoSuccess = createAction<string>('IMPORT REPOS SUCCESS');
export const importRepoFailed = createAction<Error>('IMPORT REPOS FAILED');
