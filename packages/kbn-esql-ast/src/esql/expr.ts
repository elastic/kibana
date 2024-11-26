/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParseOptions } from '../parser';
import { EsqlQuery } from '../query';
import { firstItem } from '../visitor/utils';
import { clearParserFields } from './helpers';
import { BasicPrettyPrinter } from '../pretty_print';
import type { SynthGenerator, SynthTaggedTemplate, SynthTaggedTemplateWithOpts } from './types';
import type { ESQLAstExpression } from '../types';

const generate: SynthGenerator = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLAstExpression => {
  const querySrc = 'FROM a | STATS ' + src;
  const query = EsqlQuery.fromSrc(querySrc, { withFormatting, ...rest });
  const where = query.ast.commands[1];
  const expression = firstItem(where.args)!;

  clearParserFields(expression);

  return expression;
};

const expressionTag: SynthTaggedTemplateWithOpts = (opts?: ParseOptions) => {
  return (template: TemplateStringsArray, ...params: Array<ESQLAstExpression | string>) => {
    let src = '';
    const length = template.length;
    for (let i = 0; i < length; i++) {
      src += template[i];
      if (i < params.length) {
        const param = params[i];
        if (typeof param === 'string') src += param;
        else src += BasicPrettyPrinter.expression(param);
      }
    }
    return generate(src, opts);
  };
};

export const expr: SynthGenerator & SynthTaggedTemplate & SynthTaggedTemplateWithOpts = ((
  ...args
) => {
  const [first] = args;

  /**
   * Usage as function:
   *
   * ```js
   * expr('42');
   * ```
   */
  if (typeof first === 'string') return generate(first, args[1] as ParseOptions);

  /**
   * Usage as tagged template:
   *
   * ```js
   * expr`42`;
   * ```
   */
  if (Array.isArray(first)) {
    return expressionTag()(first as TemplateStringsArray, ...(args as any).slice(1));
  }

  /**
   * Usage as tagged template, with ability to specify parsing options:
   *
   * ```js
   * expr({ withFormatting: false })`42`;
   * ```
   */
  return expressionTag(args[0] as ParseOptions);
}) as SynthGenerator & SynthTaggedTemplate & SynthTaggedTemplateWithOpts;
