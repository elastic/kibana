/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  actions,
  ActorRef,
  AnyEventObject,
  EventObject,
  Expr,
  PureAction,
  SendActionOptions,
} from 'xstate';

export const sendIfDefined =
  <TSentEvent extends EventObject = AnyEventObject>(target: string | ActorRef<TSentEvent>) =>
  <TContext, TEvent extends EventObject>(
    eventExpr: Expr<TContext, TEvent, TSentEvent | undefined | null>,
    options?: SendActionOptions<TContext, TEvent>
  ): PureAction<TContext, TEvent> => {
    return actions.pure((context, event) => {
      const targetEvent = eventExpr(context, event);
      return targetEvent != null && targetEvent !== undefined
        ? [actions.sendTo(target, targetEvent, options)]
        : undefined;
    });
  };
