/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLNumberLiteral } from '../../../types';
import { firstItem } from '../../utils';
import { CommandVisitorContext } from '../command_visitor_context';
import type { SharedData } from '../../global_visitor_context';
import type { VisitorMethods } from '../../types';

export class LimitCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data> {
  /**
   * @returns The first numeric literal argument of the command.
   */
  public numericLiteral(): ESQLNumberLiteral | undefined {
    const arg = firstItem(this.node.args);

    if (arg && arg.type === 'literal' && arg.literalType === 'number') {
      return arg;
    }
  }

  /**
   * @returns The value of the first numeric literal argument of the command.
   */
  public numeric(): number | undefined {
    const literal = this.numericLiteral();

    return literal?.value;
  }
}
