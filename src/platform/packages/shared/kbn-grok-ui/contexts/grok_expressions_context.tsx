/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import type { DraftGrokExpression } from '../models';
import { DraftGrokExpression as DraftGrokExpressionClass } from '../models';
import { useGrokCollection } from './grok_collection_context';

interface GrokExpressionsContextValue {
  expressions: DraftGrokExpression[];
}

const GrokExpressionsContext = createContext<GrokExpressionsContextValue | undefined>(undefined);

/**
 * Hook to manage DraftGrokExpression instances based on an array of grok pattern strings.
 *
 * This hook abstracts away the complexity of creating, updating, and destroying DraftGrokExpression
 * instances. Consumers just work with plain string arrays, and this hook ensures that:
 * - DraftGrokExpression instances are created and destroyed as needed
 * - Instances are reused for stable identity (important for React reconciliation)
 * - Subscriptions to custom pattern changes are properly managed
 * - Memory leaks are prevented through proper cleanup
 *
 * @param patterns - Array of grok pattern strings
 * @returns Array of DraftGrokExpression instances corresponding to the input strings
 *
 * @example
 * const patterns = ['%{TIMESTAMP} %{LOGLEVEL}', '%{IP}'];
 * const expressions = useGrokExpressions(patterns);
 * // expressions[0] is a DraftGrokExpression for the first pattern
 * // expressions[1] is a DraftGrokExpression for the second pattern
 */
export const useGrokExpressions = (patterns: string[]): DraftGrokExpression[] => {
  const { grokCollection } = useGrokCollection();
  const [expressions, setExpressions] = useState<DraftGrokExpression[]>([]);
  const expressionsRef = useRef<DraftGrokExpression[]>([]);

  // Serialize patterns for stable dependency comparison
  const patternsKey = useMemo(() => JSON.stringify(patterns), [patterns]);

  // Sync expressions with patterns array
  useEffect(() => {
    if (!grokCollection) {
      setExpressions([]);
      expressionsRef.current = [];
      return;
    }

    const newExpressions = [...expressionsRef.current];

    // Adjust array length
    while (newExpressions.length > patterns.length) {
      const removed = newExpressions.pop();
      removed?.destroy();
    }

    while (newExpressions.length < patterns.length) {
      const idx = newExpressions.length;
      newExpressions.push(new DraftGrokExpressionClass(grokCollection, patterns[idx]));
    }

    // Update expressions that have changed
    newExpressions.forEach((expr, idx) => {
      const currentPattern = expr.getExpression();
      const newPattern = patterns[idx];
      if (currentPattern !== newPattern) {
        expr.updateExpression(newPattern);
      }
    });

    expressionsRef.current = newExpressions;
    setExpressions(newExpressions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternsKey, grokCollection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      expressionsRef.current.forEach((expr) => expr.destroy());
      expressionsRef.current = [];
    };
  }, []);

  return expressions;
};

interface GrokExpressionsProviderProps {
  patterns: string[];
  children: React.ReactNode;
}

/**
 * Provider component that converts an array of grok pattern strings into
 * DraftGrokExpression instances and makes them available to child components.
 *
 * This provider sits between the GrokCollectionProvider (which provides the collection)
 * and components that need to render/interact with specific grok patterns (like Sample components).
 *
 * Usage:
 * ```tsx
 * <GrokExpressionsProvider patterns={['%{TIMESTAMP}', '%{IP}']}>
 *   <Sample />  // Can access expressions via useGrokExpressionsFromContext()
 * </GrokExpressionsProvider>
 * ```
 */
export const GrokExpressionsProvider = ({ patterns, children }: GrokExpressionsProviderProps) => {
  const expressions = useGrokExpressions(patterns);

  return (
    <GrokExpressionsContext.Provider value={{ expressions }}>
      {children}
    </GrokExpressionsContext.Provider>
  );
};

/**
 * Hook to access DraftGrokExpression instances from context.
 * Must be used within a GrokExpressionsProvider.
 *
 * @returns Array of DraftGrokExpression instances
 * @throws Error if used outside of GrokExpressionsProvider
 */
export const useGrokExpressionsFromContext = (): DraftGrokExpression[] => {
  const context = useContext(GrokExpressionsContext);
  if (context === undefined) {
    throw new Error('useGrokExpressionsFromContext must be used within a GrokExpressionsProvider');
  }
  return context.expressions;
};
