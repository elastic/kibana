/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSingleAstItem, ESQLAstAllCommands } from '@elastic/esql/types';
export interface PositionContext {
  expressionRoot?: ESQLSingleAstItem;
}
export declare enum CaretPosition {
  RERANK_KEYWORD = 0, // After RERANK: can be target field assignment or query
  RERANK_AFTER_TARGET_FIELD = 1, // After potential target field: suggest assignment operator
  RERANK_AFTER_TARGET_ASSIGNMENT = 2, // After "target_field ="
  ON_KEYWORD = 3, // Should suggest "ON"
  ON_EXPRESSION = 4, // After "ON": handle all field list expressions like EVAL
  AFTER_WITH_KEYWORD = 5, // After "WITH " but before opening brace: suggest opening braces with params
  WITHIN_MAP_EXPRESSION = 6, // After "WITH": suggest a json of params
  AFTER_COMMAND = 7,
}
/**
 * Determines caret position in RERANK command
 */
export declare function getPosition(query: string, command: ESQLAstAllCommands): CaretPosition;
export declare function isAfterPotentialTargetFieldWithSpace(innerText: string): boolean;
