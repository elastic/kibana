/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLNumberLiteral } from '../types';
import { AstNodeParserFields, AstNodeTemplate } from './types';

export class Builder {
  /**
   * Constructs fields which are only available when the node is minted by
   * the parser.
   */
  public static readonly parserFields = ({
    location = { min: 0, max: 0 },
    text = '',
    incomplete = false,
  }: Partial<AstNodeParserFields>): AstNodeParserFields => ({
    location,
    text,
    incomplete,
  });

  /**
   * Constructs a integer literal node.
   */
  public static readonly numericLiteral = (
    template: Omit<AstNodeTemplate<ESQLNumberLiteral>, 'literalType' | 'name'>
  ): ESQLNumberLiteral => {
    const node: ESQLNumberLiteral = {
      ...template,
      ...Builder.parserFields(template),
      type: 'literal',
      literalType: 'integer',
      name: template.value.toString(),
    };

    return node;
  };
}
