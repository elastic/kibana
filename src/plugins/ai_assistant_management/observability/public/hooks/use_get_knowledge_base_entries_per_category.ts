/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useGetKnowledgeBaseEntries } from './use_get_knowledge_base_entries';
import type { KnowledgeBaseEntry } from '../../common/types';

export interface KnowledgeBaseEntryCategory {
  categoryName: string;
  entries: KnowledgeBaseEntry[];
}

export interface UseGetKnowledgeBaseEntriesPerCategoryResponse {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  entries: KnowledgeBaseEntryCategory[];
}
export function useGetKnowledgeBaseEntriesPerCategory() {
  const { entries = [], isLoading, isError, isSuccess } = useGetKnowledgeBaseEntries();

  return {
    isLoading,
    isError,
    isSuccess,
    categories: entries.reduce((acc, entry) => {
      const categoryName = entry.labels.category ?? 'other';

      const index = acc.findIndex((item) => item.categoryName === categoryName);

      if (index > -1) {
        acc[index].entries.push(entry);
        return acc;
      } else {
        return acc.concat({ categoryName, entries: [entry] });
      }
    }, [] as Array<{ categoryName: string; entries: KnowledgeBaseEntry[] }>),
  };
}
