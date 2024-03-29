/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { Operations, OperationsWithReferences, OperationsWithSourceField } from '../constants';

export type Operation = $Values<typeof Operations>;
export type OperationWithSourceField = $Values<typeof OperationsWithSourceField>;
export type OperationWithReferences = $Values<typeof OperationsWithReferences>;
