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

import { findUsagesTool } from './find_usages';
import { client } from '../utils/elasticsearch';

jest.mock('../utils/elasticsearch', () => ({
  client: {
    search: jest.fn(),
  },
}));

describe('findUsagesTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a report for a symbol', async () => {
    const mockAggs = {
      files: {
        buckets: [
          {
            key: 'src/core/public/plugin.ts',
            kinds: { buckets: [{ key: 'lexical_declaration' }] },
            languages: { buckets: [{ key: 'typescript' }] },
          },
          {
            key: 'src/plugins/my_plugin/public/app.tsx',
            kinds: { buckets: [{ key: 'import_statement' }, { key: 'call_expression' }] },
            languages: { buckets: [{ key: 'typescript' }] },
          },
        ],
      },
    };
    (client.search as jest.Mock).mockResolvedValue({ aggregations: mockAggs });

    const result = await findUsagesTool.handler({ symbol: 'CoreSetup' });

    expect(client.search).toHaveBeenCalledWith({
      index: 'kibana-code-search',
      size: 0,
      query: { match: { content: 'CoreSetup' } },
      aggs: expect.any(Object),
    });

    const report = result.content[0].text;
    expect(report).toContain('### Usage Report for "CoreSetup"');
    expect(report).toContain('**Primary Definition(s):**');
    expect(report).toContain('`src/core/public/plugin.ts`');
    expect(report).toContain('**Execution/Call Site(s):**');
    expect(report).toContain('`src/plugins/my_plugin/public/app.tsx`');
  });

  it('should handle cases where no usages are found', async () => {
    (client.search as jest.Mock).mockResolvedValue({ aggregations: { files: { buckets: [] } } });

    const result = await findUsagesTool.handler({ symbol: 'NonExistentSymbol' });
    const report = result.content[0].text;
    expect(report).toContain('### Usage Report for "NonExistentSymbol"');
    expect(report).toContain('No usages found.');
  });
});
