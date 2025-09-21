/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOptionNode } from '../ast/is';
import { within } from '../ast/location';
import type { ESQLAst, ESQLCommand, ESQLSingleAstItem } from '../types';
import { Walker } from '../walker';
import { Location } from './types';

const commandOptionNameToLocation: Record<string, Location> = {
  eval: Location.EVAL,
  where: Location.WHERE,
  row: Location.ROW,
  sort: Location.SORT,
  stats: Location.STATS,
  inlinestats: Location.STATS,
  by: Location.STATS_BY,
  enrich: Location.ENRICH,
  with: Location.ENRICH_WITH,
  dissect: Location.DISSECT,
  rename: Location.RENAME,
  join: Location.JOIN,
  show: Location.SHOW,
  completion: Location.COMPLETION,
  rerank: Location.RERANK,
};

/**
 * Pause before using this in new places. Where possible, use the Location enum directly.
 *
 * This is primarily around for backwards compatibility with the old system of command and option names.
 */
const getLocationFromCommandOrOptionName = (name: string) => commandOptionNameToLocation[name];

/**
 * Identifies the location ID at the given position
 */
export function getLocationInfo(
  position: ESQLSingleAstItem | number,
  parentCommand: ESQLCommand,
  ast: ESQLAst,
  withinAggFunction: boolean
): { id: Location; displayName: string } {
  if (withinAggFunction && ast[0].name === 'ts') {
    return {
      id: Location.STATS_TIMESERIES,
      displayName: 'agg_function_in_timeseries_context',
    };
  }

  const option = Walker.find(parentCommand, (node) => isOptionNode(node) && within(position, node));

  const displayName = (option ?? parentCommand).name;

  const id = getLocationFromCommandOrOptionName(displayName);

  return { id, displayName };
}
