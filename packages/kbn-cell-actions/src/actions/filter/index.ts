/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFilterInAction, addFilterIn } from './filter_in';
import { createFilterOutAction, addFilterOut } from './filter_out';

import { createActionFactory } from '../factory';

export const createFilterInActionFactory = createActionFactory(createFilterInAction);
export const createFilterOutActionFactory = createActionFactory(createFilterOutAction);

export { addFilterIn, addFilterOut };
