/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { CommitDiff } from '../../common/git_diff';

export const loadCommit = createAction<string>('LOAD COMMIT');
export const loadCommitSuccess = createAction<CommitDiff>('LOAD COMMIT SUCCESS');
export const loadCommitFailed = createAction<Error>('LOAD COMMIT FAILED');
