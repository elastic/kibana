/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useState } from 'react';
import { IndexPattern, IndexPatternsContract } from '../../../../data/common';

export const useIndexPattern = (indexPatterns: IndexPatternsContract, indexPatternId: string) => {
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);

  useEffect(() => {
    async function loadIndexPattern() {
      const ip = await indexPatterns.get(indexPatternId);
      setIndexPattern(ip);
    }
    loadIndexPattern();
  });
  return indexPattern;
};
