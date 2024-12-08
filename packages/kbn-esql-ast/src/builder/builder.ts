/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-namespace */

import { LeafPrinter } from '../pretty_print';
import {
  ESQLAstComment,
  ESQLAstCommentMultiLine,
  ESQLAstCommentSingleLine,
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandOption,
  ESQLDecimalLiteral,
  ESQLIdentifier,
  ESQLInlineCast,
  ESQLIntegerLiteral,
  ESQLList,
  ESQLLocation,
  ESQLNamedParamLiteral,
  ESQLParam,
  ESQLPositionalParamLiteral,
  ESQLOrderExpression,
  ESQLSource,
  ESQLParamLiteral,
  ESQLFunction,
  ESQLAstItem,
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

  export const comment = <S extends ESQLAstComment['subtype']>(
    subtype: S,
    text: string,
    location?: ESQLLocation
  ): S extends 'multi-line' ? ESQLAstCommentMultiLine : ESQLAstCommentSingleLine => {
    return {
      type: 'comment',
      subtype,
      text,
      location,
    } as S extends 'multi-line' ? ESQLAstCommentMultiLine : ESQLAstCommentSingleLine;
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

    export const indexSource = (
      index: string,
      cluster?: string,
      template?: Omit<AstNodeTemplate<ESQLSource>, 'name' | 'index' | 'cluster'>,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLSource => {
      return {
        ...template,
        ...Builder.parserFields(fromParser),
        index,
        cluster,
        name: (cluster ? cluster + ':' : '') + index,
        sourceType: 'index',
        type: 'source',
      };
    };

    export const column = (
      template: Omit<AstNodeTemplate<ESQLColumn>, 'name' | 'quoted' | 'parts'>,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLColumn => {
      const node: ESQLColumn = {
        ...template,
        ...Builder.parserFields(fromParser),
        parts: template.args.map((arg) =>
          arg.type === 'identifier' ? arg.name : LeafPrinter.param(arg)
        ),
        quoted: false,
        name: '',
        type: 'column',
      };

      node.name = LeafPrinter.column(node);

      return node;
    };

    export const order = (
      operand: ESQLColumn,
      template: Omit<AstNodeTemplate<ESQLOrderExpression>, 'name' | 'args'>,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLOrderExpression => {
      return {
        ...template,
        ...Builder.parserFields(fromParser),
        name: '',
        args: [operand],
        type: 'order',
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

    export namespace func {
      export const node = (
        template: AstNodeTemplate<ESQLFunction>,
        fromParser?: Partial<AstNodeParserFields>
      ): ESQLFunction => {
        return {
          ...template,
          ...Builder.parserFields(fromParser),
          type: 'function',
        };
      };

      export const call = (
        nameOrOperator: string | ESQLIdentifier | ESQLParamLiteral,
        args: ESQLAstItem[],
        template?: Omit<AstNodeTemplate<ESQLFunction>, 'subtype' | 'name' | 'operator' | 'args'>,
        fromParser?: Partial<AstNodeParserFields>
      ): ESQLFunction => {
        let name: string;
        let operator: ESQLIdentifier | ESQLParamLiteral;
        if (typeof nameOrOperator === 'string') {
          name = nameOrOperator;
          operator = Builder.identifier({ name });
        } else {
          operator = nameOrOperator;
          name = LeafPrinter.print(operator);
        }
        return Builder.expression.func.node(
          { ...template, name, operator, args, subtype: 'variadic-call' },
          fromParser
        );
      };

      export const binary = (
        name: string,
        args: [left: ESQLAstItem, right: ESQLAstItem],
        template?: Omit<AstNodeTemplate<ESQLFunction>, 'subtype' | 'name' | 'operator' | 'args'>,
        fromParser?: Partial<AstNodeParserFields>
      ): ESQLFunction => {
        const operator = Builder.identifier({ name });
        return Builder.expression.func.node(
          { ...template, name, operator, args, subtype: 'binary-expression' },
          fromParser
        );
      };
    }

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

      export const integer = (
        value: number,
        template?: Omit<AstNodeTemplate<ESQLIntegerLiteral | ESQLDecimalLiteral>, 'name'>,
        fromParser?: Partial<AstNodeParserFields>
      ): ESQLIntegerLiteral | ESQLDecimalLiteral => {
        return Builder.expression.literal.numeric(
          {
            ...template,
            value,
            literalType: 'integer',
          },
          fromParser
        );
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

  export const identifier = (
    template: AstNodeTemplate<ESQLIdentifier>,
    fromParser?: Partial<AstNodeParserFields>
  ): ESQLIdentifier => {
    return {
      ...template,
      ...Builder.parserFields(fromParser),
      type: 'identifier',
    };
  };

  export namespace param {
    export const unnamed = (fromParser?: Partial<AstNodeParserFields>): ESQLParam => {
      const node = {
        ...Builder.parserFields(fromParser),
        name: '',
        value: '',
        paramType: 'unnamed',
        type: 'literal',
        literalType: 'param',
      };

      return node as ESQLParam;
    };

    export const named = (
      template: Omit<AstNodeTemplate<ESQLNamedParamLiteral>, 'name' | 'literalType' | 'paramType'>,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLNamedParamLiteral => {
      const node: ESQLNamedParamLiteral = {
        ...template,
        ...Builder.parserFields(fromParser),
        name: '',
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
      };

      return node;
    };

    export const positional = (
      template: Omit<
        AstNodeTemplate<ESQLPositionalParamLiteral>,
        'name' | 'literalType' | 'paramType'
      >,
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLPositionalParamLiteral => {
      const node: ESQLPositionalParamLiteral = {
        ...template,
        ...Builder.parserFields(fromParser),
        name: '',
        type: 'literal',
        literalType: 'param',
        paramType: 'positional',
      };

      return node;
    };

    export const build = (
      name: string,
      options: Partial<ESQLParamLiteral> = {},
      fromParser?: Partial<AstNodeParserFields>
    ): ESQLParam => {
      const value: string = name.startsWith('?') ? name.slice(1) : name;

      if (!value) {
        return Builder.param.unnamed(options);
      }

      const isNumeric = !isNaN(Number(value)) && String(Number(value)) === value;

      if (isNumeric) {
        return Builder.param.positional({ ...options, value: Number(value) }, fromParser);
      } else {
        return Builder.param.named({ ...options, value }, fromParser);
      }
    };
  }
}
