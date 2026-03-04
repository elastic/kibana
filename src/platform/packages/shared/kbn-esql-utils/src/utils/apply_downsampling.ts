/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, isAssignment } from '@elastic/esql';
import type { ESQLFunction } from '@elastic/esql/types';
import { getLimitFromESQLQuery } from './query_parsing_helpers';
import { queryCannotBeSampled } from './query_cannot_be_sampled';

const MIN_SAMPLE_RATE = 0.001;
const MAX_SAMPLE_RATE = 1.0;

const hasExistingApproximationSetting = (query: string): boolean => {
  const { root } = Parser.parse(query);
  if (!root.header?.length) {
    return false;
  }
  return root.header.some((cmd) => {
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
};

const hasExistingSampleCommand = (query: string): boolean => {
  const { root } = Parser.parse(query);
  return root.commands.some(({ name }) => name === 'sample');
};

const hasExistingStatsCommand = (query: string): boolean => {
  const { root } = Parser.parse(query);
  return root.commands.some(({ name }) => name === 'stats');
};

/**
 * Applies automatic downsampling to an ES|QL query based on the available
 * UI data points (typically derived from chart pixel width).
 *
 * - Queries with STATS: prepends `SET approximation = true;`
 * - Queries without STATS: appends `| SAMPLE <rate>` where rate is
 *   derived from `maxDataPoints / currentLimit`
 *
 * Skips modification when:
 * - The query already contains SET approximation or a SAMPLE command
 * - The query contains functions incompatible with sampling (match, qstr)
 * - maxDataPoints is not a positive number
 * - The computed sample rate is >= 1 (no downsampling needed)
 */
export const applyDownsampling = (query: string, maxDataPoints: number): string => {
  if (!query || !maxDataPoints || maxDataPoints <= 0) {
    return query;
  }

  if (hasExistingSampleCommand(query)) {
    return query;
  }

  if (hasExistingApproximationSetting(query)) {
    return query;
  }

  const hasStats = hasExistingStatsCommand(query);

  if (hasStats) {
    return `SET approximation = true;\n${query}`;
  }

  if (queryCannotBeSampled({ esql: query })) {
    return query;
  }

  const currentLimit = getLimitFromESQLQuery(query);
  const rate = Math.min(MAX_SAMPLE_RATE, Math.max(MIN_SAMPLE_RATE, maxDataPoints / currentLimit));

  if (rate >= MAX_SAMPLE_RATE) {
    return query;
  }

  return `${query}\n| SAMPLE ${rate}`;
};
