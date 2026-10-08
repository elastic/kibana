/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@elastic/esql/types';

/**
 * Returns the query without its last (partial) command, i.e. the columns available before the
 * command at the cursor. The single-command case is kept as-is so source commands still resolve.
 */
export const queryUntilPreviousCommand = (root: ESQLAstQueryExpression): ESQLAstQueryExpression =>
  root.commands.length === 1
    ? { ...root, commands: [root.commands[0]] }
    : { ...root, commands: root.commands.slice(0, -1) };
