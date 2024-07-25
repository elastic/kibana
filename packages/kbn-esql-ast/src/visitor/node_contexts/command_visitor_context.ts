/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLAstCommand } from '../../types';
import { VisitorContext } from './visitor_context';
import { singleItems } from '../utils';
import { SourceVisitorContext } from './source_visitor_context';
import { CommandOptionVisitorContext } from './command_option_visitor_context';
import type { SharedData } from '../global_visitor_context';
import type { UndefinedToVoid, VisitorMethods } from '../types';

export class CommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLAstCommand> {
  public *visitSources(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitSource']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitSource']>>> {
    this.ctx.assertMethodExists('visitSource');

    for (const arg of singleItems(this.node.args)) {
      if (arg.type === 'source') {
        const sourceContext = new SourceVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitSource!(sourceContext, input);

        yield result;
      }
    }
  }

  public *visitOptions(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitCommandOption']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitCommandOption']>>> {
    this.ctx.assertMethodExists('visitCommandOption');

    for (const arg of singleItems(this.node.args)) {
      if (arg.type === 'option') {
        const sourceContext = new CommandOptionVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitCommandOption!(sourceContext, input);

        yield result;
      }
    }
  }
}
