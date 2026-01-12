/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as synth from './synth';
import { ComposerQuery } from './composer_query';
import { DoubleParameterHole, ParameterHole } from './parameter_hole';
import { processTemplateHoles, removeNopCommands, validateParamName } from './util';
import type {
  ComposerColumnShorthand,
  ComposerQueryGenerator,
  ComposerQueryTag,
  ComposerQueryTagHole,
  ComposerQueryTagMethods,
  ComposerSourceShorthand,
  FromSourcesAndMetadataQueryStarter,
  FromSourcesQueryStarter,
  ParametrizedComposerQueryTag,
} from './types';
import type { ESQLSource } from '../types';
import { isSource } from '../ast/is';

const esqlTag = ((templateOrQueryOrParamValues: any, ...maybeHoles: ComposerQueryTagHole[]) => {
  const tagOrGeneratorWithParams = (initialParamValues?: Record<string, unknown>) =>
    ((templateOrQuery: any, ...holes: ComposerQueryTagHole[]) => {
      const params = new Map<string, unknown>(
        initialParamValues ? Object.entries(initialParamValues) : []
      );

      if (typeof templateOrQuery === 'string') {
        /**
         * Case when the query is constructed from a string, with optional
         * parameter values provided as an object.
         *
         * ```typescript
         * const query = esql('FROM index | WHERE foo > ?more', { more: 42 });
         * ```
         */
        const ast = synth.qry(templateOrQuery);

        ast.commands = removeNopCommands(ast.commands);

        const moreParamValues =
          typeof holes[0] === 'object' && !Array.isArray(holes[0]) ? holes[0] : {};

        for (const [name, value] of Object.entries(moreParamValues)) {
          validateParamName(name);
          params.set(name, value);
        }

        const query = new ComposerQuery(ast, params);

        return query;
      }

      /**
       * Case when the query builder is called as a tagged template:
       *
       * ```typescript
       * const query = esql `FROM index | WHERE foo > 42 | LIMIT 10`;
       * ```
       */
      const processedHoles = processTemplateHoles(holes, params);
      const ast = synth.qry(
        templateOrQuery as TemplateStringsArray,
        ...(holes as synth.SynthTemplateHole[])
      );

      ast.commands = removeNopCommands(ast.commands);

      const query = new ComposerQuery(ast, processedHoles.params);

      return query;
    }) as ComposerQueryTag & ComposerQueryGenerator;

  if (
    !!templateOrQueryOrParamValues &&
    typeof templateOrQueryOrParamValues === 'object' &&
    !Array.isArray(templateOrQueryOrParamValues)
  ) {
    /**
     * Case when the tagged template is called with an object as the
     * first argument, which contains parameter values.
     *
     * ```typescript
     * const query = esql({ input: 42, limit: 10 }) `
     *   FROM index | WHERE foo > ?input | LIMIT ?limit`;
     * ```
     */
    return tagOrGeneratorWithParams(templateOrQueryOrParamValues) as ComposerQueryTag;
  }

  /**
   * Case when the query composer is called as a tagged template without an
   * object as the first argument, or when called as a function with a query string.
   *
   * ```typescript
   * const query = esql `FROM index | WHERE foo > 42 | LIMIT 10`;
   * ```
   *
   * or
   *
   * ```typescript
   * const query = esql('FROM index | WHERE foo > 42 | LIMIT 10');
   * ```
   */
  return tagOrGeneratorWithParams()(templateOrQueryOrParamValues, ...maybeHoles);
}) as ComposerQueryTag & ParametrizedComposerQueryTag & ComposerQueryGenerator;

/**
 * Creates a new {@linkcode ComposerQuery} constructor function for `FROM` or `TS`
 * command, which allows to start a new query form a list of sources and
 * optionally metadata fields.
 */
const createFromLikeStarter = (
  cmd: 'FROM' | 'TS'
): FromSourcesQueryStarter & FromSourcesAndMetadataQueryStarter =>
  ((first: unknown, ...remaining: unknown[]) => {
    if (Array.isArray(first)) {
      return createFromSourceAndMetadataCommandStarter(cmd)(
        first as ComposerSourceShorthand[],
        remaining[0] as ComposerColumnShorthand[] | undefined
      );
    } else {
      return createFromSourceCommandStarter(cmd)(
        first as ComposerSourceShorthand,
        ...(remaining as ComposerSourceShorthand[])
      );
    }
  }) as FromSourcesQueryStarter & FromSourcesAndMetadataQueryStarter;

const createFromSourceCommandStarter =
  (cmd: 'FROM' | 'TS'): FromSourcesQueryStarter =>
  (...sources: ComposerSourceShorthand[]) => {
    const nodes: ESQLSource[] = [];

    for (const source of sources) {
      if (typeof source === 'string') {
        nodes.push(synth.src(source));
      } else if (isSource(source)) {
        nodes.push(source);
      } else {
        throw new Error(`Invalid source: ${source}`);
      }
    }

    return esql`${synth.kwd(cmd)} ${nodes}`;
  };

const createFromSourceAndMetadataCommandStarter =
  (cmd: 'FROM' | 'TS'): FromSourcesAndMetadataQueryStarter =>
  (sources: ComposerSourceShorthand[], metadataFields: ComposerColumnShorthand[] = []) => {
    const sourceNodes = sources.map((source) => {
      if (typeof source === 'string') {
        return synth.src(source);
      } else if (isSource(source)) {
        return source;
      } else {
        throw new Error(`Invalid source: ${source}`);
      }
    });
    const metadataFieldsNodes = metadataFields.map((field) => {
      return synth.col(field);
    });

    return metadataFieldsNodes.length
      ? esql`${synth.kwd(cmd)} ${sourceNodes} METADATA ${metadataFieldsNodes}`
      : esql`${synth.kwd(cmd)} ${sourceNodes}`;
  };

/**
 * ESQL query composer tag function.
 *
 * This function allows you to create ESQL queries using template literals.
 * It supports both static and dynamic inputs, but it is designed to provide
 * safe and structured query construction with dynamic parameters.
 *
 * Basic example:
 *
 * ```typescript
 * const inputFromUser = 42;
 * const query = esql`FROM index | WHERE foo > ${inputFromUser} | LIMIT 10`;
 * ```
 *
 * @param templateOrQuery The ESQL query template or a string representing the query.
 * @param holes The dynamic values to be interpolated into the query.
 * @returns A ComposerQuery instance representing the constructed ESQL query.
 */
export const esql: ComposerQueryTag &
  ParametrizedComposerQueryTag &
  ComposerQueryGenerator &
  ComposerQueryTagMethods = Object.assign(
  /**
   * The `esql` tag function:
   *
   * ```typescript
   * const query = esql`FROM index | WHERE foo > 42 | LIMIT 10`;
   * ```
   */
  esqlTag,

  /**
   * Re-sharing the Synth module for convenience.
   *
   * ```typescript
   * const expression = esql.exp `abc > 42`;
   * ```
   */
  synth,

  /**
   * Overwriting Synth API for custom handling of ESQL parameters.
   */
  {
    par: (value: unknown, name?: string) => new ParameterHole(value, name),

    dpar: (value: unknown, name?: string) => new DoubleParameterHole(value, name),

    from: createFromLikeStarter('FROM'),

    ts: createFromLikeStarter('TS'),

    get nop() {
      return synth.cmd`WHERE TRUE`;
    },
  }
);

/**
 * Alias for {@link esql} for convenience.
 */
export const e = esql;
