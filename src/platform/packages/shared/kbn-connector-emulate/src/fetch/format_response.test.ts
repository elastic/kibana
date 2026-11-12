/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall } from './create_emulator_fetch';
import { formatResponse } from './format_response';

const call = (overrides: Partial<ContractCall> = {}): ContractCall => ({
  request: 'POST https://api.example.com/v1/search',
  status: 200,
  requestViolations: [],
  responseViolations: [],
  ...overrides,
});

const captured = (body: unknown, bodyTruncated?: true): ContractCall['captured'] => ({
  request: { headers: {}, query: {} },
  response: {
    headers: {},
    ...(body === undefined ? {} : { body }),
    ...(bodyTruncated ? { bodyTruncated } : {}),
  },
});

describe('formatResponse', () => {
  it('shows the status, where the answer came from and the body as indented JSON', () => {
    expect(
      formatResponse(
        call({ responseSource: 'runtime-fixture', captured: captured({ success: true, id: 'a' }) })
      )
    ).toBe(
      ['← 200 [runtime-fixture]', '  {', '    "success": true,', '    "id": "a"', '  }'].join('\n')
    );
  });

  it('shows a text body as it is', () => {
    expect(formatResponse(call({ captured: captured('plain text') }))).toBe(
      ['← 200', '  plain text'].join('\n')
    );
  });

  it('says only the status and where the answer came from when there is no body', () => {
    expect(
      formatResponse(
        call({ status: 204, responseSource: 'generated', captured: captured(undefined) })
      )
    ).toBe('← 204 [generated]');
  });

  it('shows the first lines of a long body, and says how many it left out', () => {
    const shown = formatResponse(
      call({ captured: captured({ items: ['a', 'b', 'c', 'd', 'e'] }) }),
      4
    );

    expect(shown).toBe(
      ['← 200', '  {', '    "items": [', '      "a",', '      "b",', '  … 5 more lines'].join('\n')
    );
  });

  it('cuts a line that is too long to read, such as the markdown of a page', () => {
    const line = (
      formatResponse(call({ captured: captured({ markdown: 'x'.repeat(500) }) })) as string
    )
      .split('\n')
      .find((text) => text.includes('"markdown"'));

    expect(line).toBeDefined();
    expect((line as string).length).toBeLessThan(200);
    expect(line).toMatch(/…$/);
  });

  it('says the capture cut a body that was too long to keep', () => {
    expect(formatResponse(call({ captured: captured('{"items": [1, 2,', true) }))).toBe(
      ['← 200', '  {"items": [1, 2,', '  … the capture cut the rest of the body'].join('\n')
    );
  });

  it('has nothing to show for a call without a capture', () => {
    expect(formatResponse(call())).toBeUndefined();
  });
});
