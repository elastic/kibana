/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import { LogExplorerContext } from '../state_machines/data_access_state_machine';

type FieldCounts = Record<string, number>;

export const useFieldCounts = (logExplorerContext: LogExplorerContext) => {
  const { topChunk, bottomChunk } = logExplorerContext;

  const fieldCounts: FieldCounts = useMemo(() => {
    if (topChunk.status !== 'loaded' || bottomChunk.status !== 'loaded') {
      return {};
    }

    const entries = [...topChunk.entries, ...bottomChunk.entries];

    return entries.reduce<FieldCounts>((fieldCountsAcc, entry) => {
      return Object.keys(entry.fields).reduce((countsAcc, field) => {
        return {
          ...countsAcc,
          [field]: (countsAcc[field] || 0) + 1,
        };
      }, fieldCountsAcc);
    }, {});
  }, [topChunk, bottomChunk]);

  return fieldCounts;
};
