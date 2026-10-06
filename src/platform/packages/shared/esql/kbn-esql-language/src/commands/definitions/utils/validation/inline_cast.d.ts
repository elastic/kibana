/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WalkerAstNode } from '@elastic/esql';
import type { ESQLMessage } from '../../..';
import type { ICommandContext } from '../../../registry/types';
/**
 * Validates inline casts within the given AST node.
 */
export declare function validateInlineCasts(
  astNode: WalkerAstNode,
  context: ICommandContext
): ESQLMessage[];
