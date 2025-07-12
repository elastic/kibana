/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Token } from 'antlr4';

/**
 * The root ANTLR rule to start parsing from.
 */
export const GRAMMAR_ROOT_RULE = 'singleStatement';

/**
 * @todo Move this out of the parser/ folder.
 */
export const EDITOR_MARKER = 'marker_esql_editor';

export const DEFAULT_CHANNEL: number = +(Token as any).DEFAULT_CHANNEL;
export const HIDDEN_CHANNEL: number = +(Token as any).HIDDEN_CHANNEL;
