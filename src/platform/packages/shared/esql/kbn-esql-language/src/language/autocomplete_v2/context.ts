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
import { EsqlQuery } from '@elastic/esql';
import type { ICommand } from '../../commands/registry/registry';
import type { ColumnsMap } from '../shared/columns_retrieval_helpers';
import { locate, type CursorIR } from '../../esql_js_sim/grammar';
import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';
import { getNesting, getQueryBeforeCursor } from './pipeline';
import { getRegisteredCommand } from './command_metadata';
import type { SuggestionContext } from './types';

const isSame = (first: string[], second: string[]): boolean =>
  first.length === second.length && first.every((rule, index) => rule === second[index]);

// A name no query contains, which the lexer reads as a name in every place a name can be.
const PLACEHOLDER_NAME = 'esql_placeholder_name';
const NAME_RULES: readonly string[] = ['qualifiedName', 'qualifiedNamePattern', 'identifier'];

type ColumnRetriever = ReturnType<typeof getColumnsByTypeRetriever>;

/** The columns of the query before the cursor, fetched on the first request only. */
const createColumnsGetters = (
  text: string,
  ir: CursorIR,
  callbacks: ESQLCallbacks | undefined
): Pick<SuggestionContext, 'getColumnsByType' | 'getColumnMap'> => {
  let retriever: ColumnRetriever | undefined;
  const getRetriever = (): ColumnRetriever | undefined => {
    const query = getQueryBeforeCursor(text, ir);

    if (!retriever && query) {
      retriever = getColumnsByTypeRetriever(EsqlQuery.fromSrc(query).ast, query, callbacks);
    }

    return retriever;
  };

  return {
    getColumnsByType: async (...args) => (await getRetriever()?.getColumnsByType(...args)) ?? [],
    getColumnMap: async () => (await getRetriever()?.getColumnMap()) ?? (new Map() as ColumnsMap),
  };
};

/**
 * Gathers what the providers need about the editor and about the query before the cursor. It
 * reads the commands that are written, never the text of one.
 */
export const createContext = async (
  text: string,
  offset: number,
  ir: CursorIR,
  callbacks: ESQLCallbacks | undefined
): Promise<SuggestionContext> => {
  const license = await callbacks?.getLicense?.();
  const caret = ir.word?.start ?? ir.segment.end;
  const nesting = getNesting(ir);
  const registered = ir.commands.flatMap(({ rule, enclosingCommands }) => {
    const command = getRegisteredCommand(rule);

    return command ? [{ command, enclosingCommands }] : [];
  });
  const isHeader = ({ metadata }: ICommand) => metadata.type === 'header';
  const pipeline = registered.filter(
    ({ command, enclosingCommands }) => !isHeader(command) && isSame(enclosingCommands, nesting)
  );
  const [source] = pipeline;
  const afterNameText = `${text.slice(0, caret)}${PLACEHOLDER_NAME} `;

  return {
    callbacks,
    text,
    offset,
    ir,
    afterName: locate(afterNameText, afterNameText.length),
    ...createColumnsGetters(text, ir, callbacks),
    usedNames: new Set(
      ir.commands.flatMap(({ arguments: written }) =>
        written
          .filter(({ rule }) => rule !== undefined && NAME_RULES.includes(rule))
          .map((argument) => argument.text.replace(/`/g, ''))
      )
    ),
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
