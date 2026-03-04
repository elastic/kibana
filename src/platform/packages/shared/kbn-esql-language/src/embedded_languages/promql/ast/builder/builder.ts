/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AstNodeParserFields } from '../../../../ast/builder/types';
import type {
  PromQLAstQueryExpression,
  PromQLFunction,
  PromQLSelector,
  PromQLBinaryExpression,
  PromQLUnaryExpression,
  PromQLSubquery,
  PromQLParens,
  PromQLNumericLiteral,
  PromQLStringLiteral,
  PromQLTimeValue,
  PromQLIdentifier,
  PromQLLabel,
  PromQLLabelMap,
  PromQLGrouping,
  PromQLModifier,
  PromQLGroupModifier,
  PromQLEvaluation,
  PromQLOffset,
  PromQLAt,
  PromQLUnknownItem,
  PromQLBinaryOperator,
  PromQLLabelMatchOperator,
  PromQLLabelName,
  PromQLAstExpression,
  PromQLAtModifier,
} from '../../types';
import type { PromQLAstNodeTemplate } from './types';

/* eslint-disable @typescript-eslint/no-namespace */

export namespace PromQLBuilder {
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

  export namespace expression {
    export const query = (
      expr: PromQLAstExpression | undefined,
      fromParser?: Partial<AstNodeParserFields>
    ): PromQLAstQueryExpression => {
      return {
        dialect: 'promql',
        type: 'query',
        name: '',
        expression: expr,
        ...PromQLBuilder.parserFields(fromParser),
      };
    };

    export const parens = (
      child: PromQLAstExpression,
      fromParser?: Partial<AstNodeParserFields>
    ): PromQLParens => {
      return {
        dialect: 'promql',
        type: 'parens',
        name: '',
        child,
        ...PromQLBuilder.parserFields(fromParser),
      };
    };

    export namespace func {
      export const call = (
        name: string,
        args: PromQLAstExpression[],
        grouping?: PromQLGrouping,
        groupingPosition?: 'before' | 'after',
        fromParser?: Partial<AstNodeParserFields>
      ): PromQLFunction => {
        return {
          dialect: 'promql',
          type: 'function',
          name,
          args,
          grouping,
          groupingPosition,
          ...PromQLBuilder.parserFields(fromParser),
        };
      };
    }

    export namespace selector {
      export const node = (
        template: Omit<PromQLAstNodeTemplate<PromQLSelector>, 'name' | 'args'>,
        fromParser?: Partial<AstNodeParserFields>
      ): PromQLSelector => {
        const metricName = template.metric?.name ?? '';

        // Build args array with all defined children in order
        const args: PromQLSelector['args'] = [];
        if (template.metric) {
          args.push(template.metric);
        }
        if (template.labelMap) {
          args.push(template.labelMap);
        }
        if (template.duration) {
          args.push(template.duration);
        }
        if (template.evaluation) {
          args.push(template.evaluation);
        }

        return {
          dialect: 'promql',
          type: 'selector',
          name: metricName,
          args,
          metric: template.metric,
          labelMap: template.labelMap,
          duration: template.duration,
          evaluation: template.evaluation,
          ...PromQLBuilder.parserFields(fromParser),
        };
      };
    }

    export const binary = <Name extends PromQLBinaryOperator>(
      operator: Name,
      left: PromQLAstExpression,
      right: PromQLAstExpression,
      options?: {
        bool?: boolean;
        modifier?: PromQLModifier;
      },
      fromParser?: Partial<AstNodeParserFields>
    ): PromQLBinaryExpression<Name> => {
      return {
        dialect: 'promql',
        type: 'binary-expression',
        name: operator,
        left,
        right,
        bool: options?.bool,
        modifier: options?.modifier,
        ...PromQLBuilder.parserFields(fromParser),
      };
    };

    export const unary = (
      operator: '+' | '-',
      arg: PromQLAstExpression,
      fromParser?: Partial<AstNodeParserFields>
    ): PromQLUnaryExpression => {
      return {
        dialect: 'promql',
        type: 'unary-expression',
        name: operator,
        arg,
        ...PromQLBuilder.parserFields(fromParser),
      };
    };

    export const subquery = (
      expr: PromQLAstExpression,
      range: PromQLAstExpression,
      resolution?: PromQLAstExpression,
      evaluation?: PromQLEvaluation,
      fromParser?: Partial<AstNodeParserFields>
    ): PromQLSubquery => {
      return {
        dialect: 'promql',
        type: 'subquery',
        name: 'subquery',
        expr,
        range,
        resolution,
        evaluation,
        ...PromQLBuilder.parserFields(fromParser),
      };
    };

    export namespace literal {
      export const integer = (
        value: number,
        fromParser?: Partial<AstNodeParserFields>
      ): PromQLNumericLiteral => {
        return {
          dialect: 'promql',
          type: 'literal',
          literalType: 'integer',
          name: String(value),
          value,
          ...PromQLBuilder.parserFields(fromParser),
        };
      };

      export const decimal = (
        value: number,
        fromParser?: Partial<AstNodeParserFields>
      ): PromQLNumericLiteral => {
        return {
          dialect: 'promql',
          type: 'literal',
          literalType: 'decimal',
          name: String(value),
          value,
          ...PromQLBuilder.parserFields(fromParser),
        };
      };

      export const hexadecimal = (
        value: number,
        text: string,
        fromParser?: Partial<AstNodeParserFields>
      ): PromQLNumericLiteral => {
        return {
          dialect: 'promql',
          type: 'literal',
          literalType: 'hexadecimal',
          name: text,
          value,
          ...PromQLBuilder.parserFields(fromParser),
        };
      };

      /**
       * Create a string literal.
       *
       * @param valueUnquoted - The unquoted string value (e.g., 'hello' not '"hello"')
       * @param rawValue - Optional raw value as it appeared in source (used by parser).
       *                   If not provided, the printer will handle quoting/escaping.
       * @param fromParser - Optional parser fields
       */
      export const string = (
        valueUnquoted: string,
        rawValue?: string,
        fromParser?: Partial<AstNodeParserFields>
      ): PromQLStringLiteral => {
        return {
          dialect: 'promql',
          type: 'literal',
          literalType: 'string',
          name: rawValue ?? valueUnquoted,
          value: rawValue ?? valueUnquoted,
          valueUnquoted,
          ...PromQLBuilder.parserFields(fromParser),
        };
      };

      export const time = (
        value: string,
        fromParser?: Partial<AstNodeParserFields>
      ): PromQLTimeValue => {
        return {
          dialect: 'promql',
          type: 'literal',
          literalType: 'time',
          name: value,
          value,
          ...PromQLBuilder.parserFields(fromParser),
        };
      };
    }
  }

  export const identifier = (
    name: string,
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLIdentifier => {
    return {
      dialect: 'promql',
      type: 'identifier',
      name,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const labelMap = (
    labels: PromQLLabel[],
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLLabelMap => {
    return {
      dialect: 'promql',
      type: 'label-map',
      name: '',
      args: labels,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const label = (
    labelName: PromQLLabelName,
    operator: PromQLLabelMatchOperator,
    value: PromQLStringLiteral | undefined,
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLLabel => {
    return {
      dialect: 'promql',
      type: 'label',
      name: labelName.name,
      labelName,
      operator,
      value,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const grouping = (
    kind: 'by' | 'without',
    labels: PromQLLabelName[],
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLGrouping => {
    return {
      dialect: 'promql',
      type: 'grouping',
      name: kind,
      args: labels,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const modifier = (
    kind: 'on' | 'ignoring',
    labels: PromQLLabelName[],
    groupModifier?: PromQLGroupModifier,
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLModifier => {
    return {
      dialect: 'promql',
      type: 'modifier',
      name: kind,
      labels,
      groupModifier,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const groupModifier = (
    kind: 'group_left' | 'group_right',
    labels: PromQLLabelName[],
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLGroupModifier => {
    return {
      dialect: 'promql',
      type: 'group-modifier',
      name: kind,
      labels,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const evaluation = (
    offset?: PromQLOffset,
    at?: PromQLAt,
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLEvaluation => {
    return {
      dialect: 'promql',
      type: 'evaluation',
      name: 'evaluation',
      offset,
      at,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const offset = (
    duration: PromQLAstExpression,
    negative: boolean = false,
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLOffset => {
    return {
      dialect: 'promql',
      type: 'offset',
      name: 'offset',
      negative,
      duration,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const at = (
    value: PromQLTimeValue | PromQLAtModifier,
    negative: boolean = false,
    fromParser?: Partial<AstNodeParserFields>
  ): PromQLAt => {
    return {
      dialect: 'promql',
      type: 'at',
      name: 'at',
      negative,
      value,
      ...PromQLBuilder.parserFields(fromParser),
    };
  };

  export const unknown = (fromParser?: Partial<AstNodeParserFields>): PromQLUnknownItem => {
    return {
      dialect: 'promql',
      type: 'unknown',
      name: 'unknown',
      ...PromQLBuilder.parserFields(fromParser),
    };
  };
}
