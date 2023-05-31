/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PropsWithChildren, FC, ComponentPropsWithoutRef } from 'react';

export type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
  i: infer I
) => void
  ? I
  : never;

type CombinedProps<P extends Array<FC<any>>> = PropsWithChildren<
  UnionToIntersection<ComponentPropsWithoutRef<P[number]>>
>;

const compose = <P extends Array<FC<any>>>(providers: P, props: CombinedProps<P>): FC<{}> => {
  return ({ children }) => (
    <>
      {providers.reduceRight((acc, ContextProvider) => {
        return <ContextProvider {...props}>{acc}</ContextProvider>;
      }, children)}
    </>
  );
};

export const composeProviders = <P extends Array<FC<any>>>(providers: P): FC<CombinedProps<P>> => {
  return (props: CombinedProps<P>) => {
    const ContextProvider = compose(providers, props);
    return <ContextProvider>{props.children}</ContextProvider>;
  };
};

export type ComposeProvidersFn = typeof composeProviders;
