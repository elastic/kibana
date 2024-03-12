/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';

export interface KnowledgeBaseEntryCategory {
  '@timestamp': string;
  categoryName: string;
  entries: KnowledgeBaseEntry[];
}

export function categorizeEntries({ entries }: { entries: KnowledgeBaseEntry[] }) {
  return entries.reduce((acc, entry) => {
    const categoryName = entry.labels?.category ?? entry.id;

    const index = acc.findIndex((item) => item.categoryName === categoryName);

    if (index > -1) {
      acc[index].entries.push(entry);
      return acc;
    } else {
      return acc.concat({ categoryName, entries: [entry], '@timestamp': entry['@timestamp'] });
    }
  }, [] as Array<{ categoryName: string; entries: KnowledgeBaseEntry[]; '@timestamp': string }>);
}
