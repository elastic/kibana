/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../builder';
import { LeafPrinter } from '../pretty_print';
import { isProperNode } from '../ast/is';
import { SynthNode } from './synth_node';
import { serialize } from './helpers';
import type { SynthTemplateHole } from './types';

class UnexpectedSynthHoleError extends Error {
  constructor(hole: unknown) {
    super(`Unexpected synth hole: ${JSON.stringify(hole)}`);
  }
}

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
    case 'number': {
      const isInteger = Math.round(hole) === hole;
      const node = isInteger
        ? Builder.expression.literal.integer(hole)
        : Builder.expression.literal.decimal(hole);

      return LeafPrinter.literal(node);
    }
    case 'object': {
      if (Array.isArray(hole)) {
        let list: string = '';

        for (const item of hole) {
          list += (list ? ', ' : '') + holeToFragment(item);
        }

        return list;
      } else if (hole instanceof SynthNode || isProperNode(hole)) {
        return serialize(hole);
      }

      throw new UnexpectedSynthHoleError(hole);
    }
    default: {
      throw new UnexpectedSynthHoleError(hole);
    }
  }
};
