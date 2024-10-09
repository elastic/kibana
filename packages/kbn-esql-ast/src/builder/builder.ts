/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-namespace */

import {
  ESQLAstComment,
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandOption,
  ESQLDecimalLiteral,
  ESQLInlineCast,
  ESQLIntegerLiteral,
  ESQLList,
  ESQLLocation,
  ESQLSource,
} from '../types';
import { AstNodeParserFields, AstNodeTemplate, PartialFields } from './types';

export namespace Builder {
  /**
   * Constructs fields which are only available when the node is minted by
   * the parser.
   */
  export const parserFields = ({
    location = { min: 0, max: 0 },
    text = '',
    incomplete = false,
  }: Partial<AstNodeParserFields> = {}): AstNodeParserFields => ({
    location,
    text,
    incomplete,
  });

  export const command = (
    template: PartialFields<AstNodeTemplate<ESQLCommand>, 'args'>,
    fromParser?: Partial<AstNodeParserFields>
  ): ESQLCommand => {
    return {
      ...template,
      ...Builder.parserFields(fromParser),
      args: template.args ?? [],
      type: 'command',
    };
  };

  export const option = (
    template: PartialFields<AstNodeTemplate<ESQLCommandOption>, 'args'>,
    fromParser?: Partial<AstNodeParserFields>
  ): ESQLCommandOption => {
    return {
      ...template,
      ...Builder.parserFields(fromParser),
      args: template.args ?? [],
      type: 'option',
    };
  };

  export const comment = (
    subtype: ESQLAstComment['subtype'],
    text: string,
    location: ESQLLocation
  ): ESQLAstComment => {
    return {
      type: 'comment',
      subtype,
      text,
      location,
    };
  };

  export namespace expression {
    export const query = (
      commands: ESQLAstQueryExpression['commands'] = [],
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLAstQueryExpression => {
      return {
        ...Builder.parserFields(fromParser),
        commands,
        type: 'query',
        name: '',
      };
    };

    export const source = (
      template: AstNodeTemplate<ESQLSource>,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLSource => {
      return {
        ...template,
        ...Builder.parserFields(fromParser),
        type: 'source',
      };
    };

    export const column = (
      template: Omit<AstNodeTemplate<ESQLColumn>, 'name' | 'quoted'>,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLColumn => {
      return {
        ...template,
        ...Builder.parserFields(fromParser),
        quoted: false,
        name: template.parts.join('.'),
        type: 'column',
      };
    };

    export const inlineCast = (
      template: Omit<AstNodeTemplate<ESQLInlineCast>, 'name'>,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLInlineCast => {
      return {
        ...template,
        ...Builder.parserFields(fromParser),
        type: 'inlineCast',
        name: '',
      };
    };

    export namespace literal {
      /**
       * Constructs an integer literal node.
       */
      export const numeric = (
        template: Omit<AstNodeTemplate<ESQLIntegerLiteral | ESQLDecimalLiteral>, 'name'>,
        fromParser?: Partial<AstNodeParserFields>
      ): ESQLIntegerLiteral | ESQLDecimalLiteral => {
        const node: ESQLIntegerLiteral | ESQLDecimalLiteral = {
          ...template,
          ...Builder.parserFields(fromParser),
          type: 'literal',
          name: template.value.toString(),
        };

        return node;
      };

      export const list = (
        template: Omit<AstNodeTemplate<ESQLList>, 'name'>,
        fromParser?: Partial<AstNodeParserFields>
      ): ESQLList => {
        return {
          ...template,
          ...Builder.parserFields(fromParser),
          type: 'list',
          name: '',
        };
      };
    }
  }
}
