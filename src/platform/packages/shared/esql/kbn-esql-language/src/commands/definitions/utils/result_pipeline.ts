/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSource, isSubQuery } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstForkCommand, ESQLAstItem } from '@elastic/esql/types';
import { TRANSFORMATIONAL_COMMANDS } from '../../../constants';
import { esqlCommandRegistry } from '../../registry';
import {
  findNamedSubqueryForSource,
  getNamedSubqueriesAvailableTo,
  type NamedSubquery,
} from './named_subqueries';

export type EsqlRowOrigin = 'schema' | 'other' | 'mixed';

export interface EsqlResultPipeline {
  readonly rowOrigin: EsqlRowOrigin;
  readonly mayReturnSourceDocuments: boolean;
  readonly hasResultAggregation: boolean;
  readonly hasLegacyTransformationalFork: boolean;
}

const DEFAULT_RESULT: EsqlResultPipeline = {
  rowOrigin: 'other',
  mayReturnSourceDocuments: true,
  hasResultAggregation: false,
  hasLegacyTransformationalFork: false,
};

export const isAggregatingCommand = ({ name }: ESQLAstCommand): boolean =>
  name === 'stats' || name === 'promql';

function combineResults(results: readonly EsqlResultPipeline[]): EsqlResultPipeline {
  const [first] = results;
  if (!first) {
    return DEFAULT_RESULT;
  }

  return {
    rowOrigin: results.every(({ rowOrigin }) => rowOrigin === first.rowOrigin)
      ? first.rowOrigin
      : 'mixed',
    mayReturnSourceDocuments: results.some(
      ({ mayReturnSourceDocuments }) => mayReturnSourceDocuments
    ),
    hasResultAggregation: results.some(({ hasResultAggregation }) => hasResultAggregation),
    hasLegacyTransformationalFork: results.some(
      ({ hasLegacyTransformationalFork }) => hasLegacyTransformationalFork
    ),
  };
}

/** Analyzes the commands and subqueries that supply the result rows. */
export function analyzeResultPipeline(
  commands: readonly ESQLAstCommand[],
  namedSubqueries: readonly NamedSubquery[] = []
): EsqlResultPipeline {
  const bindingResults = new Map<NamedSubquery, EsqlResultPipeline>();

  function getSourceResult(
    source: ESQLAstItem,
    bindings: readonly NamedSubquery[]
  ): EsqlResultPipeline {
    if (isSubQuery(source)) {
      return analyze(source.child.commands, bindings);
    }

    const binding = isSource(source) && findNamedSubqueryForSource(source, bindings);
    if (!binding) {
      return DEFAULT_RESULT;
    }

    const cached = bindingResults.get(binding);
    if (cached !== undefined) {
      return cached;
    }

    const result = analyze(
      binding.query.commands,
      getNamedSubqueriesAvailableTo(bindings, binding)
    );
    bindingResults.set(binding, result);
    return result;
  }

  function analyze(
    pipeline: readonly ESQLAstCommand[],
    bindings: readonly NamedSubquery[],
    input = DEFAULT_RESULT
  ): EsqlResultPipeline {
    let result = input;
    for (const command of pipeline) {
      if (command.name === 'from') {
        result = combineResults(
          command.args
            .filter((arg) => isSource(arg) || isSubQuery(arg))
            .map((arg) => getSourceResult(arg, bindings))
        );
      } else if (command.name === 'fork') {
        const { args } = command as ESQLAstForkCommand;
        if (args.length > 0) {
          const branches = combineResults(
            args.map(({ child }) =>
              child.type === 'query' ? analyze(child.commands, bindings, result) : result
            )
          );
          result = {
            ...branches,
            hasLegacyTransformationalFork:
              branches.hasLegacyTransformationalFork ||
              args.every(
                ({ child }) =>
                  child.type === 'query' &&
                  child.commands.length > 0 &&
                  child.commands.every(({ name }) => TRANSFORMATIONAL_COMMANDS.includes(name))
              ),
          };
        }
      } else if (
        esqlCommandRegistry.getCommandByName(command.name)?.metadata.rowOrigin === 'schema'
      ) {
        result = { ...result, rowOrigin: 'schema', mayReturnSourceDocuments: false };
      } else if (isAggregatingCommand(command)) {
        result = { ...result, mayReturnSourceDocuments: false, hasResultAggregation: true };
      }
    }
    return result;
  }

  return analyze(commands, namedSubqueries);
}

/** Returns the origin of the rows supplied by the pipeline. */
export function getPipelineRowOrigin(
  commands: readonly ESQLAstCommand[],
  namedSubqueries?: readonly NamedSubquery[]
): EsqlRowOrigin {
  return analyzeResultPipeline(commands, namedSubqueries).rowOrigin;
}
