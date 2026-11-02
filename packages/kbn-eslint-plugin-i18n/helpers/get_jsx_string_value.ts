/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { decode } from 'he';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

/**
 * Returns the text of a JSX text node or JSX attribute string with HTML entities such as `&nbsp;`
 * decoded. Oxlint keeps entities as written in `value`, so this decodes `raw` like ESLint's parsers
 * did. JSX attribute strings have no escape sequences, so `raw` is the value plus quotes.
 */
export const getJsxStringValue = (node: TSESTree.JSXText | TSESTree.Literal): string =>
  decode(node.type === AST_NODE_TYPES.JSXText ? node.raw : node.raw.slice(1, -1));
