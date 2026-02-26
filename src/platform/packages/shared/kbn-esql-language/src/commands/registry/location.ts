/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunctionExpression, isOptionNode } from '../../ast/is';
import { within } from '../../ast/location';
import type { ESQLAst, ESQLAstAllCommands, ESQLSingleAstItem } from '../../types';
import { Walker } from '../../ast/walker';
import { Location } from './types';
import { isTimeseriesSourceCommand } from '../definitions/utils/timeseries_check';

const commandOptionNameToLocation: Record<string, Location> = {
  eval: Location.EVAL,
  where: Location.WHERE,
  row: Location.ROW,
  sort: Location.SORT,
  stats: Location.STATS,
  'inline stats': Location.STATS,
  by: Location.STATS_BY,
  enrich: Location.ENRICH,
  with: Location.ENRICH_WITH,
  dissect: Location.DISSECT,
  rename: Location.RENAME,
  join: Location.JOIN,
  show: Location.SHOW,
  completion: Location.COMPLETION,
  rerank: Location.RERANK,
  'join:on': Location.JOIN,
  'rerank:on': Location.RERANK,
};

/**
 * Configuration for function-based locations.
 * Maps command name -> function name -> location config.
 * If argIndex is specified, the position must be within that specific argument.
 */
const functionBasedLocations: Record<
  string,
  Record<string, { location: Location; displayName: string; argIndex?: number }>
> = {
  stats: {
    where: { location: Location.STATS_WHERE, displayName: 'stats_where', argIndex: 1 },
  },
  'inline stats': {
    where: { location: Location.STATS_WHERE, displayName: 'inline stats_where', argIndex: 1 },
  },
};

/**
 * Pause before using this in new places. Where possible, use the Location enum directly.
 *
 * This is primarily around for backwards compatibility with the old system of command and option names.
 */
export const getLocationFromCommandOrOptionName = (name: string) =>
  commandOptionNameToLocation[name];

/**
 * Identifies the location ID at the given position
 */
export function getLocationInfo(
  position: ESQLSingleAstItem | number,
  parentCommand: ESQLAstAllCommands,
  ast: ESQLAst,
  withinAggFunction: boolean
): { id: Location; displayName: string } {
  if (withinAggFunction && isTimeseriesSourceCommand(ast)) {
    return {
      id: Location.STATS_TIMESERIES,
      displayName: 'agg_function_in_timeseries_context',
    };
  }

  const option = Walker.find(parentCommand, (node) => isOptionNode(node) && within(position, node));

  if (option) {
    const displayName = option.name;
    const parentCommandName = parentCommand.name;
    const contextualKey = `${parentCommandName}:${displayName}`;
    const id =
      commandOptionNameToLocation[contextualKey] ?? getLocationFromCommandOrOptionName(displayName);
    return { id, displayName };
  }

  // If not in an option node, try to find a function that defines a location
  // We need to find ALL functions containing the position, then check if any have a location config
  const funcs = Walker.findAll(
    parentCommand,
    (node) => isFunctionExpression(node) && within(position, node)
  );

  // Iterate through all matching functions to find one with a location config
  for (const func of funcs) {
    if (!isFunctionExpression(func)) {
      continue;
    }

    const locationConfig = functionBasedLocations[parentCommand.name]?.[func.name];

    if (locationConfig) {
      // If argIndex is specified, position must be within that specific argument
      if (locationConfig.argIndex !== undefined) {
        const targetArg = func.args[locationConfig.argIndex];
        const arg = Array.isArray(targetArg) ? targetArg[0] : targetArg;

        if (arg && !Array.isArray(arg) && 'location' in arg && within(position, arg)) {
          return { id: locationConfig.location, displayName: locationConfig.displayName };
        }
      } else {
        // No argIndex constraint, return immediately
        return { id: locationConfig.location, displayName: locationConfig.displayName };
      }
    }
  }

  const displayName = (option ?? parentCommand).name;

  const id = getLocationFromCommandOrOptionName(displayName);

  return { id, displayName };
}
