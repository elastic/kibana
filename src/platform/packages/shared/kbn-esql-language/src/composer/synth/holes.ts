/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../ast/builder';
import { BasicPrettyPrinter, LeafPrinter } from '../../pretty_print';
import { isProperNode } from '../../ast/is';
import { SynthNode } from './synth_node';
import { SynthLiteralFragment } from './synth_literal_fragment';
import type {
  SynthColumnShorthand,
  SynthQualifiedColumnShorthand,
  SynthTemplateHole,
} from './types';

class UnexpectedSynthHoleError extends Error {
  constructor(hole: unknown) {
    super(`Unexpected synth hole: ${JSON.stringify(hole)}`);
  }
}

const isColumnShorthand = (hole: unknown): hole is SynthColumnShorthand => {
  return Array.isArray(hole) && hole.every((part) => typeof part === 'string');
};

/**
 * Identifies qualified column shorthand tuples.
 * ['qualifier', ['fieldName']]
 * ['qualifier', ['fieldPart1', 'fieldPart2']]
 * @param hole
 * @returns
 */
export const isQualifiedColumnShorthand = (
  hole: unknown
): hole is SynthQualifiedColumnShorthand => {
  return (
    Array.isArray(hole) &&
    hole.length === 2 &&
    typeof hole[0] === 'string' &&
    isColumnShorthand(hole[1])
  );
};

/**
 * Converts a synth template hole to a string fragment. A *hole" in a tagged
 * template is JavaScript value, which is returned as-is, during the template
 * execution:
 *
 * ```js
 * tag `SELECT * FROM table WHERE id = ${hole}`;
 * ```
 *
 * In the above example, the `hole` value is fed into the `tag` function as-is
 * (it is not converted to a string). This function is used to convert the
 * hole to a string fragment, which can be used in the query string.
 *
 * @param hole The hole to convert to a string fragment.
 * @returns A string representation of the hole.
 */
export const holeToFragment = (hole: SynthTemplateHole): string => {
  switch (typeof hole) {
    case 'string': {
      const node = Builder.expression.literal.string(hole);

      return LeafPrinter.string(node);
    }
    case 'number': {
      const isInteger = Math.round(hole) === hole;
      const node = isInteger
        ? Builder.expression.literal.integer(hole)
        : Builder.expression.literal.decimal(hole);

      return LeafPrinter.literal(node);
    }
    case 'boolean': {
      const node = Builder.expression.literal.boolean(hole);

      return LeafPrinter.literal(node);
    }
    case 'object': {
      if (hole instanceof SynthLiteralFragment) {
        return hole.value;
      }

      if (isColumnShorthand(hole)) {
        const node = Builder.expression.column(hole);

        return LeafPrinter.column(node);
      }

      if (isQualifiedColumnShorthand(hole)) {
        const qualifier = hole[0];
        const columnParts = hole[1];
        const node = Builder.expression.column(columnParts, qualifier);

        return LeafPrinter.column(node);
      }

      if (Array.isArray(hole)) {
        let list: string = '';

        for (const item of hole) {
          list += (list ? ', ' : '') + holeToFragment(item);
        }

        return list;
      } else if (hole instanceof SynthNode || isProperNode(hole)) {
        return BasicPrettyPrinter.print(hole);
      }

      throw new UnexpectedSynthHoleError(hole);
    }
    default: {
      throw new UnexpectedSynthHoleError(hole);
    }
  }
};
