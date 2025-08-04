/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as synth from '../synth';
import { ComposerQuery } from './composer_query';
import { ParameterHole } from './parameter_hole';
import { processTemplateHoles } from './util';
import type {
  ComposerQueryGenerator,
  ComposerQueryTag,
  ComposerQueryTagHole,
  ComposerQueryTagMethods,
} from './types';

const esqlTag = ((templateOrQuery: any, ...holes: ComposerQueryTagHole[]) => {
  const { params } = processTemplateHoles(holes);
  const ast =
    typeof templateOrQuery === 'string'
      ? synth.qry(templateOrQuery)
      : synth.qry(templateOrQuery as TemplateStringsArray, ...(holes as synth.SynthTemplateHole[]));
  const query = new ComposerQuery(ast, params);

  return query;
}) as ComposerQueryTag & ComposerQueryGenerator;

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
export const esql: ComposerQueryTag & ComposerQueryGenerator & ComposerQueryTagMethods =
  Object.assign(
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
    }
  );

/**
 * Alias for {@link esql} for convenience.
 */
export const e = esql;
