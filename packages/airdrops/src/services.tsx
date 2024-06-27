/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, PropsWithChildren, useContext } from 'react';

import { KibanaDependencies, AirdropServices } from './types';

const Context = React.createContext<AirdropServices | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const AirdropProvider: FC<PropsWithChildren<AirdropServices>> = ({
  children,
  ...services
}) => {
  return <Context.Provider value={services}>{children}</Context.Provider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const AirdropKibanaProvider: FC<PropsWithChildren<KibanaDependencies>> = ({
  children,
  ...dependencies
}) => {
  const { airdrop } = dependencies;

  const value: AirdropServices = {
    ...airdrop,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/**
 * React hook for accessing pre-wired services.
 */
export function useAirdrop() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'Airdrop Context is missing. Ensure your component or React root is wrapped with AirdropContext.'
    );
  }

  return context;
}
