/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../pretty_print';
import type { ESQLProperNode } from '../types';

export const serialize = (node: ESQLProperNode): string => {
  return node.type === 'query'
    ? BasicPrettyPrinter.print(node)
    : node.type === 'command'
    ? BasicPrettyPrinter.command(node)
    : BasicPrettyPrinter.expression(node);
};
