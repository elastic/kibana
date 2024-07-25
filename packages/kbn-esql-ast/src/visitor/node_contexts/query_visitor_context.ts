/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisitorContext } from './visitor_context';
import { CommandVisitorContext } from './command_visitor_context';
import type { ESQLAst } from '../../types';
import type { SharedData } from '../global_visitor_context';
import type { UndefinedToVoid, VisitorMethods } from '../types';
import { FromCommandVisitorContext, LimitCommandVisitorContext } from './command_contexts';

export class QueryVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLAst> {
  public *visitCommands(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitCommand']>>[1]>
  ): Iterable<
    | ReturnType<NonNullable<Methods['visitCommand']>>
    | ReturnType<NonNullable<Methods['visitFromCommand']>>
  > {
    this.ctx.assertMethodExists('visitCommand');

    const methods = this.ctx.methods;

    COMMANDS: for (const cmd of this.node) {
      if (cmd.type === 'command') {
        switch (cmd.name) {
          case 'from': {
            if (methods.visitFromCommand) {
              const childContext = new FromCommandVisitorContext(this.ctx, cmd, this);
              const result = methods.visitFromCommand!(childContext, input);

              yield result;
              continue COMMANDS;
            }
            break;
          }
          case 'limit': {
            if (methods.visitLimitCommand) {
              const childContext = new LimitCommandVisitorContext(this.ctx, cmd, this);
              const result = methods.visitLimitCommand!(childContext, input);

              yield result;
              continue COMMANDS;
            }
            break;
          }
        }

        const childContext = new CommandVisitorContext(this.ctx, cmd, this);
        const result = methods.visitCommand!(childContext, input);

        yield result as ReturnType<NonNullable<Methods['visitCommand']>>;
      }
    }
  }
}
