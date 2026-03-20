/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, walk, isAssignment } from '@elastic/esql';
import type { ESQLFunction } from '@elastic/esql/types';
import { DEFAULT_ESQL_LIMIT } from '../../constants';

const MIN_SAMPLE_RATE = 0.001;
const MAX_SAMPLE_RATE = 1.0;

/**
 * Applies automatic downsampling to an ES|QL query based on the available
 * UI data points (typically derived from chart pixel width).
 *
 * - Queries with STATS: prepends `SET approximation = true;`
 * - Queries without STATS: inserts `| SAMPLE <rate>` right after the
 *   source command (FROM/TS) so that sampling is pushed down to the
 *   storage layer for maximum performance
 *
 * Skips modification when:
 * - The query already contains SET approximation or a SAMPLE command
 * - maxDataPoints is not a positive number
 * - The computed sample rate is >= 1 (no downsampling needed)
 */
export const applyDownsampling = (query: string, maxDataPoints: number): string => {
  if (!query || !maxDataPoints || maxDataPoints <= 0) {
    return query;
  }

  const { root } = Parser.parse(query);

  if (root.commands.some(({ name }) => name === 'sample')) {
    return query;
  }

  const hasApproximation = root.header?.some((cmd) => {
    if (cmd.name !== 'set' || !cmd.args?.length) {
      return false;
    }
    return cmd.args.some((arg) => {
      if (!isAssignment(arg)) {
        return false;
      }
      const fn = arg as ESQLFunction;
      return fn.args[0] && 'name' in fn.args[0] && fn.args[0].name === 'approximation';
    });
  });

  if (hasApproximation) {
    return query;
  }

  if (root.commands.some(({ name }) => name === 'stats')) {
    return `SET approximation = true;\n${query}`;
  }

  const limitCommands = root.commands.filter(({ name }) => name === 'limit');
  let currentLimit = DEFAULT_ESQL_LIMIT;
  if (limitCommands.length) {
    const limits: number[] = [];
    walk(root.commands, {
      visitLiteral: (node) => {
        if (!isNaN(Number(node.value))) {
          limits.push(Number(node.value));
        }
      },
    });
    if (limits.length) {
      currentLimit = Math.min(...limits);
    }
  }

  const rate = Math.min(MAX_SAMPLE_RATE, Math.max(MIN_SAMPLE_RATE, maxDataPoints / currentLimit));

  if (rate >= MAX_SAMPLE_RATE) {
    return query;
  }

  const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
  if (sourceCommand) {
    const insertPos = sourceCommand.location.max + 1;
    return `${query.slice(0, insertPos)}\n| SAMPLE ${rate}${query.slice(insertPos)}`;
  }

  return `${query}\n| SAMPLE ${rate}`;
};
