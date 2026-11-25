/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeSemantics } from './semantic_normalization.ts';

const document = (step: Record<string, unknown>) => ({ steps: [step] });

describe('normalizeSemantics', () => {
  it('turns numeric-string exit statuses into integers, including inside groups', () => {
    const input = {
      steps: [
        { command: 'a', retry: { automatic: [{ exit_status: '-1', limit: 3 }] } },
        {
          group: 'g',
          steps: [{ command: 'b', retry: { automatic: [{ exit_status: '143', limit: 1 }] } }],
        },
      ],
    };

    expect(normalizeSemantics(input)).toEqual({
      steps: [
        { command: 'a', retry: { automatic: [{ exit_status: -1, limit: 3 }] } },
        {
          group: 'g',
          steps: [{ command: 'b', retry: { automatic: [{ exit_status: 143, limit: 1 }] } }],
        },
      ],
    });
  });

  it('leaves the wildcard, integers and `automatic: false` alone', () => {
    const inputs = [
      document({
        command: 'a',
        retry: {
          automatic: [
            { exit_status: '*', limit: 1 },
            { exit_status: 1, limit: 1 },
          ],
        },
      }),
      document({ command: 'b', retry: { automatic: false } }),
    ];

    inputs.forEach((input) => expect(normalizeSemantics(input)).toEqual(input));
  });

  it('changes nothing outside retry.automatic[].exit_status', () => {
    const input = document({
      command: 'a',
      label: '-1',
      env: { CODE: '-1' },
      depends_on: ['-1'],
      timeout_in_minutes: 30,
    });

    expect(normalizeSemantics(input)).toEqual(input);
  });

  it('does not mutate its input', () => {
    const input = document({
      command: 'a',
      retry: { automatic: [{ exit_status: '-1', limit: 3 }] },
    });
    const copy = JSON.parse(JSON.stringify(input));

    normalizeSemantics(input);

    expect(input).toEqual(copy);
  });
});
