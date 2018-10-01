/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const loadUserConfig = createAction('USER CONFIG');
export const loadUserConfigSuccess = createAction<string>('USER CONFIG SUCCESS');
export const loadUserConfigFailed = createAction<string>('USER CONFIG FAILED');
