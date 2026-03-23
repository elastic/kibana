/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { GrokCollection } from '../models';

interface GrokCollectionContextValue {
  grokCollection: GrokCollection | null;
  isLoading: boolean;
  error: Error | null;
}

const GrokCollectionContext = createContext<GrokCollectionContextValue | undefined>(undefined);

interface GrokCollectionProviderProps {
  grokCollection: GrokCollection;
  children: React.ReactNode;
}

/**
 * Provider component that makes a GrokCollection instance available to all child components.
 * The collection is set up (patterns loaded) automatically when the provider mounts.
 *
 * This allows multiple UI components to share the same Grok collection, and for custom
 * pattern definitions to be updated centrally.
 */
export const GrokCollectionProvider = ({
  grokCollection,
  children,
}: GrokCollectionProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const setupCollection = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await grokCollection.setup();
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to setup grok collection'));
        setIsLoading(false);
      }
    };

    setupCollection();
  }, [grokCollection]);

  return (
    <GrokCollectionContext.Provider value={{ grokCollection, isLoading, error }}>
      {children}
    </GrokCollectionContext.Provider>
  );
};

/**
 * Hook to access the GrokCollection instance from context.
 *
 * @returns The grokCollection instance, loading state, and any error
 * @throws Error if used outside of GrokCollectionProvider
 */
export const useGrokCollection = (): GrokCollectionContextValue => {
  const context = useContext(GrokCollectionContext);
  if (context === undefined) {
    throw new Error('useGrokCollection must be used within a GrokCollectionProvider');
  }
  return context;
};
