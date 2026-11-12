/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Rules reported as slots instead of the tokens they contain. */
export const PREFERRED_RULES = [
  'qualifiedName',
  'qualifiedNamePattern',
  'enrichPolicyName',
  'indexPattern',
  'functionName',
  'constant',
  'integerValue',
  'parameter',
  'identifierPattern',
  'string',
  'identifier',
] as const;

/** Rules that wrap a single command; the innermost one at the cursor bounds the segment. */
export const COMMAND_RULES = [
  'sourceCommand',
  'subquerySourceCommand',
  'processingCommand',
  'setCommand',
] as const;

/** The rule collection starts from when anchoring at a pipe. */
export const PIPE_ANCHOR_RULE = 'processingCommand';

/**
 * The rules that choose a command. A command's own rule is one of the rules they call:
 * `whereCommand` from `processingCommand`, `setCommand` from `statements`.
 */
export const COMMAND_DISPATCH_RULES = [
  'statements',
  'sourceCommand',
  'subquerySourceCommand',
  'processingCommand',
] as const;

/** Rules a dispatch rule calls that are not commands. */
export const NOT_COMMAND_RULES = ['singleStatement'] as const;
