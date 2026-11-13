/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { LicenseType } from '@kbn/licensing-types';
import type { ICommand } from '../../commands/registry/registry';
import { describeCommands, type CursorIR } from '../../esql_js_sim/grammar';
import { getRegisteredCommand } from './command_metadata';
import type { SuggestionContext } from './types';

const isSame = (first: string[], second: string[]): boolean =>
  first.length === second.length && first.every((rule, index) => rule === second[index]);

/**
 * Gathers what the providers need about the editor and about the query before the cursor. It
 * reads the commands that are written, never the text of one.
 */
export const createContext = async (
  text: string,
  ir: CursorIR,
  callbacks: ESQLCallbacks | undefined
): Promise<SuggestionContext> => {
  const license = await callbacks?.getLicense?.();
  const written = describeCommands(text.slice(0, ir.word?.start ?? ir.segment.end));
  // Where a command starts, the commands around it are the ones the cursor is nested in.
  const nesting =
    ir.position === 'start_of_command' && ir.command
      ? [...ir.enclosingCommands, ir.command]
      : ir.enclosingCommands;
  const registered = written.flatMap(({ rule, enclosingCommands }) => {
    const command = getRegisteredCommand(rule);

    return command ? [{ command, enclosingCommands }] : [];
  });
  const isHeader = ({ metadata }: ICommand) => metadata.type === 'header';
  const pipeline = registered.filter(
    ({ command, enclosingCommands }) => !isHeader(command) && isSame(enclosingCommands, nesting)
  );
  const [source] = pipeline;

  return {
    callbacks,
    hasLicense: license ? (level: LicenseType) => license.hasAtLeast(level) : undefined,
    activeProduct: callbacks?.getActiveProduct?.(),
    precedingCommands: [
      ...registered.filter(({ command }) => isHeader(command)).map(({ command }) => command),
      ...pipeline.map(({ command }) => command),
    ],
    sourceIsTimeSeries: source?.command.metadata.isTimeseries === true,
    queryContainsSubqueries: registered.some(
      ({ command, enclosingCommands }) =>
        enclosingCommands.length > 0 && command.metadata.type === 'source'
    ),
  };
};
