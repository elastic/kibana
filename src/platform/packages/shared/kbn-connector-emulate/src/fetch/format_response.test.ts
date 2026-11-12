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
  it('shows the status, where the answer came from and the body', () => {
    expect(
      formatResponse(
        call({ responseSource: 'runtime-fixture', captured: captured({ success: true, id: 'a' }) })
      )
    ).toBe('← 200 [runtime-fixture] {"success":true,"id":"a"}');
  });

  it('shows a text body as it is', () => {
    expect(formatResponse(call({ captured: captured('plain text') }))).toBe('← 200 plain text');
  });

  it('says only the status and where the answer came from when there is no body', () => {
    expect(
      formatResponse(
        call({ status: 204, responseSource: 'generated', captured: captured(undefined) })
      )
    ).toBe('← 204 [generated]');
  });

  it('cuts a long body, and says how long it was', () => {
    expect(formatResponse(call({ captured: captured({ text: 'x'.repeat(50) }) }), 20)).toBe(
      `← 200 {"text":"xxxxxxxxxxx… (61 characters)`
    );
  });

  it('says a body the capture cut was longer than what is shown', () => {
    expect(formatResponse(call({ captured: captured('short', true) }))).toBe(
      '← 200 short… (more than 5 characters)'
    );
  });

  it('has nothing to show for a call without a capture', () => {
    expect(formatResponse(call())).toBeUndefined();
  });
});
