/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { select } from './select';

// serves as reminder that we start with the state
// todo remove it as we add TS annotations (State)
const state = (d) => d;

const getScene = (state) => state.currentScene;
export const scene = select(getScene)(state);

const getPrimaryUpdate = (state) => state.primaryUpdate;
export const primaryUpdate = select(getPrimaryUpdate)(state);
