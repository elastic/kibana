/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Sample, SampleInput } from '../components';
import { useGrokCollection } from './grok_collection_context';
import { useGrokExpressionsFromContext } from './grok_expressions_context';

interface GrokSampleWithContextProps {
  sample: string;
}

/**
 * Wrapper component for the Grok Sample component that reads
 * grokCollection and draftGrokExpressions from context.
 *
 * Must be used within both GrokCollectionProvider and GrokExpressionsProvider.
 *
 * Usage:
 * ```tsx
 * <GrokCollectionProvider grokCollection={collection}>
 *   <GrokExpressionsProvider patterns={['%{TIMESTAMP}', '%{IP}']}>
 *     <GrokSampleWithContext sample="2024-01-27 192.168.1.1" />
 *   </GrokExpressionsProvider>
 * </GrokCollectionProvider>
 * ```
 */
export const GrokSampleWithContext = ({ sample }: GrokSampleWithContextProps) => {
  const { grokCollection } = useGrokCollection();
  const draftGrokExpressions = useGrokExpressionsFromContext();

  if (!grokCollection) {
    return null;
  }

  return (
    <Sample
      grokCollection={grokCollection}
      draftGrokExpressions={draftGrokExpressions}
      sample={sample}
    />
  );
};

/**
 * Wrapper component for the Grok Sample component that reads
 * grokCollection and draftGrokExpressions from context.
 *
 * Must be used within both GrokCollectionProvider and GrokExpressionsProvider.
 *
 * Usage:
 * ```tsx
 * <GrokCollectionProvider grokCollection={collection}>
 *   <GrokExpressionsProvider patterns={['%{TIMESTAMP}', '%{IP}']}>
 *     <GrokSampleInputWithContext sample="2024-01-27 192.168.1.1" />
 *   </GrokExpressionsProvider>
 * </GrokCollectionProvider>
 * ```
 */
export const GrokSampleInputWithContext = ({ sample }: GrokSampleWithContextProps) => {
  const { grokCollection } = useGrokCollection();
  const draftGrokExpressions = useGrokExpressionsFromContext();

  if (!grokCollection) {
    return null;
  }

  return (
    <SampleInput
      grokCollection={grokCollection}
      draftGrokExpressions={draftGrokExpressions}
      sample={sample}
    />
  );
};
