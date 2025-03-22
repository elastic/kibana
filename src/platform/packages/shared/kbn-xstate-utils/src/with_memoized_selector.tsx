/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { createActorContext } from '@xstate5/react';
import { ActorOptions, ActorRef, Subscription, AnyActorLogic, StateMachine } from 'xstate5';
import { Selector } from 'reselect';
import { BehaviorSubject } from 'rxjs';

export function withMemoizedSelectors<
  TLogic extends AnyActorLogic,
  // need to infer the context type from the state machine - this requires
  // to list all the generic types of the state machine
  TContext extends TLogic extends StateMachine<
    infer C,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >
    ? C
    : never,
  TSelectors extends Record<string, Selector<TContext, unknown>>
>(
  context: ReturnType<typeof createActorContext<TLogic>>,
  selectors: TSelectors,
  subSubscribes?: (context: TContext) => Array<ActorRef<any, any, any>>
) {
  const SelectorContext = React.createContext<Record<string, BehaviorSubject<unknown>> | null>(
    null
  );
  const ProviderProvider: (props: {
    children: React.ReactNode;
    options?: ActorOptions<TLogic>;
    machine?: never;
    logic?: TLogic;
  }) => React.ReactElement<any, any> = ({ children, options, logic }) => {
    return (
      <context.Provider options={options} logic={logic}>
        <SelectorProvider>{children}</SelectorProvider>
      </context.Provider>
    );
  };

  const SelectorProvider = ({ children }: { children: React.ReactNode }) => {
    const actor = context.useActorRef();
    const currentContextRef = React.useRef((actor?.getSnapshot() as { context: TContext }).context);

    useEffect(() => {
      const subscription = actor.subscribe((snapshot) => {
        currentContextRef.current = snapshot;
      });
      return () => {
        subscription.unsubscribe();
      };
    }, [actor]);

    const selectorSubjects = useMemo(() => {
      return Object.keys(selectors).reduce((acc, key) => {
        acc[key] = new BehaviorSubject(selectors[key](currentContextRef.current));
        return acc;
      }, {} as Record<string, BehaviorSubject<unknown>>);
    }, []);

    useEffect(() => {
      let activeSubscriptions: Subscription[] = [];
      let activeNestedActorRefs: Array<ActorRef<any, any, any>> = [];
      function update() {
        const newContext = { ...(actor.getSnapshot() as { context: TContext }).context };
        currentContextRef.current = newContext;

        Object.entries(selectors).forEach(([key, selector]) => {
          const newValue = selector(newContext);
          if (selectorSubjects[key].value !== newValue) {
            selectorSubjects[key].next(newValue);
          }
        });
      }
      function updateSubSubscriptions() {
        if (!subSubscribes) {
          return;
        }
        const newSubs = subSubscribes(currentContextRef.current);
        // check whether the nested actor refs have changed. If yes, re-subscribe
        if (
          newSubs.length !== activeNestedActorRefs.length ||
          newSubs.some((sub, i) => sub !== activeNestedActorRefs[i])
        ) {
          activeNestedActorRefs = newSubs;
          activeSubscriptions.forEach((sub) => sub.unsubscribe());
          activeSubscriptions = [];
          activeSubscriptions = newSubs.map((sub) => sub.subscribe(update));
        }
      }
      const subscription = actor.subscribe(() => {
        update();
        updateSubSubscriptions();
      });

      return () => {
        subscription.unsubscribe();
        activeSubscriptions.forEach((sub) => sub.unsubscribe());
      };
    }, [actor, selectorSubjects]);

    return <SelectorContext.Provider value={selectorSubjects}>{children}</SelectorContext.Provider>;
  };

  const useMemoizedSelector = <K extends keyof TSelectors>(key: K): ReturnType<TSelectors[K]> => {
    const selectorSubjects = useContext(SelectorContext);
    if (!selectorSubjects) {
      throw new Error(
        'useMemoizedSelector must be used within a Provider from withMemoizedSelectors'
      );
    }

    const currentSubject = (
      selectorSubjects as Record<K, BehaviorSubject<ReturnType<TSelectors[K]>>>
    )[key];

    const [value, setValue] = useState(currentSubject.value);

    useEffect(() => {
      const subscription = currentSubject.subscribe(setValue);
      return () => subscription.unsubscribe();
    }, [currentSubject, key, selectorSubjects]);

    return value;
  };

  return { ...context, Provider: ProviderProvider, useMemoizedSelector };
}
