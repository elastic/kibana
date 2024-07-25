/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLAstCommand, ESQLCommandOption } from '../../../types';
import { VisitorContext } from '../visitor_context';
import { singleItems } from '../../utils';
import { CommandVisitorContext } from '../command_visitor_context';
import { ColumnIdentifierVisitorContext } from '../column_identifier_visitor_context';
import type { GlobalVisitorContext, SharedData } from '../../global_visitor_context';
import type { UndefinedToVoid, VisitorMethods } from '../../types';

export class FromCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data> {
  constructor(
    /**
     * Global visitor context.
     */
    public readonly ctx: GlobalVisitorContext<Methods, Data>,

    /**
     * ES|QL command AST node, which is currently being visited.
     */
    public readonly node: ESQLAstCommand,

    /**
     * Context of the parent node, from which the current node was reached
     * during the AST traversal.
     */
    public readonly parent: VisitorContext | null = null
  ) {
    super(ctx, node, parent);
  }

  /**
   * Visit the METADATA part of the FROM command.
   *
   *   FROM <sources> [ METADATA <columns> ]
   *
   * @param input Input object to pass to all "visitColumn" children methods.
   * @returns An iterable of results of all the "visitColumn" visitor methods.
   */
  public *visitMetadataColumns(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitColumn']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitColumn']>>> {
    this.ctx.assertMethodExists('visitColumn');

    let metadataOption: ESQLCommandOption | undefined;

    for (const arg of singleItems(this.node.args)) {
      if (arg.type === 'option' && arg.name === 'metadata') {
        metadataOption = arg;
        break;
      }
    }

    if (!metadataOption) {
      return;
    }

    for (const arg of singleItems(metadataOption.args)) {
      if (arg.type === 'column') {
        const columnContext = new ColumnIdentifierVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitColumn!(columnContext, input);

        yield result;
      }
    }
  }
}
