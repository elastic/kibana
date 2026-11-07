/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryProfileView } from './aggregate_esql_profile';
import { mapOperatorsToCommands } from './map_operators_to_commands';
import { buildProfileContext } from './profile_prompt_context';
import { splitQueryCommands } from './query_commands';

/** The share of CPU time of one command of a query, with where the command is in the text. */
export interface QueryProfileHeatCommand {
  /** Offset of the first character of the command in `QueryProfileHeat.query`. */
  start: number;
  /** Offset just after the last character of the command. */
  end: number;
  /** Share of the operator CPU time, from 0 to 1. */
  share: number;
  /** True when time is shared with a similar command, so the share is an upper bound. */
  isApproximate: boolean;
  /** Operators matched to the command, slowest first. */
  operators: string[];
}

/** What an editor needs to show where a query spent its time. */
export interface QueryProfileHeat {
  /** The query text the heat was measured on. It only describes that exact text. */
  query: string;
  commands: QueryProfileHeatCommand[];
  /** A plain text description of the profile, for asking an AI how to speed a command up. */
  profileContext: string;
}

/** Builds the heat of a query from its profile, or nothing when no command gets any time. */
export function buildQueryProfileHeat(
  view: QueryProfileView,
  query: string
): QueryProfileHeat | undefined {
  const commands = splitQueryCommands(query);
  const heat = mapOperatorsToCommands(commands, view.operators);
  if (!heat.commands.some((entry) => entry.share > 0)) {
    return undefined;
  }

  return {
    query,
    commands: heat.commands.map((entry) => ({
      start: entry.command.start,
      end: entry.command.end,
      share: entry.share,
      isApproximate: entry.isApproximate,
      operators: entry.operators,
    })),
    profileContext: buildProfileContext(view),
  };
}
