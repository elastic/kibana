/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License"
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { ToolDefinition } from '../types';
import { client } from '../utils/elasticsearch';

const findUsagesInputSchema = z.object({
  symbol: z.string().describe('The symbol to find usages for.'),
});

interface FileUsageData {
  filePath: string;
  kinds: Set<string>;
  isMarkdown: boolean;
}

interface FileUsageAggResults {
  files: {
    buckets: Array<{
      key: string;
      kinds: {
        buckets: Array<{ key: string }>;
      };
      languages: {
        buckets: Array<{ key: string }>;
      };
    }>;
  };
}

async function findUsagesHandler(input: z.infer<typeof findUsagesInputSchema>) {
  const { symbol } = input;

  const response = await client.search<unknown, FileUsageAggResults>({
    index: process.env.ELASTICSEARCH_INDEX || 'kibana-code-search',
    size: 0,
    query: {
      match: {
        content: symbol,
      },
    },
    aggs: {
      files: {
        terms: {
          field: 'filePath',
          size: 1000,
        },
        aggs: {
          kinds: {
            terms: { field: 'kind' },
          },
          languages: {
            terms: { field: 'language' },
          },
        },
      },
    },
  });

  const buckets = response.aggregations?.files?.buckets || [];
  let report = `### Usage Report for "${symbol}"\n\n`;

  if (buckets.length === 0) {
    report += 'No usages found.';
    return { content: [{ type: 'text', text: report } as const] };
  }

  const filesData: FileUsageData[] = buckets.map((bucket) => ({
    filePath: bucket.key,
    kinds: new Set(bucket.kinds.buckets.map((k) => k.key)),
    isMarkdown: bucket.languages.buckets.some((l) => l.key === 'markdown'),
  }));

  const categories: Record<string, FileUsageData[]> = {
    'Primary Definition(s)': filesData.filter(
      (f: FileUsageData) =>
        f.kinds.has('function_declaration') ||
        f.kinds.has('class_declaration') ||
        f.kinds.has('lexical_declaration')
    ),
    'Type Definition(s)': filesData.filter(
      (f: FileUsageData) =>
        f.kinds.has('interface_declaration') ||
        f.kinds.has('type_alias_declaration') ||
        f.kinds.has('enum_declaration')
    ),
    'Execution/Call Site(s)': filesData.filter((f: FileUsageData) =>
      f.kinds.has('call_expression')
    ),
    'Import Reference(s)': filesData.filter((f: FileUsageData) => f.kinds.has('import_statement')),
    'Documentation / Comment(s)': filesData.filter(
      (f: FileUsageData) => f.isMarkdown || f.kinds.has('comment')
    ),
  };

  const categorizedFiles = new Set();
  Object.values(categories).forEach((list) =>
    list.forEach((f) => categorizedFiles.add(f.filePath))
  );

  categories['Other Mention(s)'] = filesData.filter(
    (f: FileUsageData) => !categorizedFiles.has(f.filePath)
  );

  for (const [category, files] of Object.entries(categories)) {
    if (files.length > 0) {
      report += `**${category}:**\n`;
      files.forEach((f: FileUsageData) => {
        const kindsString = [...f.kinds].join(', ') || 'N/A';
        report += `- \`${f.filePath}\` (Kinds: ${kindsString})\n`;
      });
      report += '\n';
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: report,
      } as const,
    ],
  };
}

export const findUsagesTool: ToolDefinition<typeof findUsagesInputSchema> = {
  name: 'find_usages',
  description:
    "Analyzes a code symbol's usage across the entire codebase and generates a rich, categorized report. Use this tool to quickly understand a symbol's architectural role, differentiate between its definition, execution sites, and type declarations, and discover where it is referenced in tests and documentation. This is a primary tool for high-level code intelligence and analysis.",
  inputSchema: findUsagesInputSchema,
  handler: findUsagesHandler,
};
