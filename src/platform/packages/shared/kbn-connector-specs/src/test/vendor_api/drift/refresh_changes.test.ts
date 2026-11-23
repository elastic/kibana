/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecChange } from './detect_drift';
import { describeChanges } from './refresh_changes';

const change = (id: string, text: string): SpecChange => ({ kind: 'non-breaking', id, text });
const scheme = (id: string, scopes: string[]) =>
  change(
    id,
    `the endpoint scheme security \`Oauth2: [${scopes
      .map((scope) => `https://www.googleapis.com/auth/${scope}`)
      .join(', ')}]\` was ${id.endsWith('-added') ? 'added to' : 'removed from'} the API`
  );

// The diff block of an area: its sections, a blank line apart, and the cell without the blank
// line that ends its last block.
const block = (...sections: string[][]): string[] => [
  '```diff',
  ...sections.flatMap((lines, index) => (index === 0 ? lines : ['', ...lines])),
  '```',
  '',
];
const cellOf = (...parts: string[][]): string[] => parts.flat().slice(0, -1);

describe('describeChanges', () => {
  it('groups the changes by where they are, then by removed, added and changed', () => {
    const lines = describeChanges([
      change(
        'response-optional-property-added',
        'added the optional property `clusters/items/addonsConfig/wizSensorConfig` to the response with the `200` status'
      ),
      change(
        'response-optional-property-removed',
        'removed the optional property `custom_attributes/key` from the response with the `200` status'
      ),
      change(
        'response-property-type-changed',
        "the `custom_attributes` response's property `type` changed from `object` to `string` for status `200`"
      ),
      change(
        'response-property-deprecated',
        'response property `clusters/items/securityPostureConfig/vulnerabilityMode` deprecated'
      ),
      change(
        'response-property-enum-value-added',
        'added the new `MIGRATE_TO_ADVANCED_DATAPATH` enum value to the `clusters/items/networkConfig/datapathProvider` response property for the response status `200`'
      ),
      scheme('api-security-removed', ['cloud-platform', 'container']),
      scheme('api-security-added', ['cloud-platform']),
      scheme('api-security-added', ['container']),
    ]);

    expect(lines).toEqual(
      cellOf(
        ['**Response fields**'],
        block(
          ['removed', '- custom_attributes/key'],
          ['added', '+ clusters/addonsConfig/wizSensorConfig'],
          [
            'changed',
            '! clusters/securityPostureConfig/vulnerabilityMode (deprecated)',
            '! custom_attributes (object → string)',
          ]
        ),
        ['**Enum values**'],
        block([
          'added',
          '+ MIGRATE_TO_ADVANCED_DATAPATH (clusters/networkConfig/datapathProvider)',
        ]),
        ['**Auth scopes**'],
        block(['regrouped, same scopes'])
      )
    );
  });

  it('shows the first three names of a section and counts the rest', () => {
    const lines = describeChanges(
      ['e', 'a', 'd', 'b', 'c'].map((name) =>
        change('response-optional-property-added', `added the optional property \`${name}\``)
      )
    );

    expect(lines).toEqual(
      cellOf(
        ['**Response fields**'],
        block(['added', '+ a', '+ b', '+ c', '  … and 2 more response fields'])
      )
    );
  });

  it('counts the rest of the changed fields as changed', () => {
    const lines = describeChanges(
      ['a', 'b', 'c', 'd'].map((name) =>
        change(
          'response-property-became-required',
          `the response property \`${name}\` became required`
        )
      )
    );

    expect(lines.join('\n')).toContain('! c (now required)\n  … and 1 more changed');
  });

  it('puts every change of a field on one line', () => {
    const lines = describeChanges([
      change(
        'request-parameter-min-length-set',
        'for the `query` request parameter `branch`, the minLength was set to `1`'
      ),
      change(
        'request-parameter-became-not-nullable',
        'the `query` request parameter `branch` became not nullable'
      ),
    ]);

    expect(lines).toEqual(
      cellOf(
        ['**Request parameters**'],
        block(['changed', '! branch (minLength set to 1, no longer nullable)'])
      )
    );
  });

  it('names the scopes that were really added or removed', () => {
    expect(
      describeChanges([
        scheme('api-security-removed', ['cloud-platform', 'container']),
        scheme('api-security-added', ['cloud-platform']),
        scheme('api-security-added', ['bigquery']),
        change(
          'api-security-scope-removed',
          "the security scope `pipeline` was removed from the endpoint's security scheme `oauth2`"
        ),
        change(
          'api-security-scope-added',
          "the security scope `pipeline:write` was added to the endpoint's security scheme `oauth2`"
        ),
      ])
    ).toEqual(
      cellOf(
        ['**Auth scopes**'],
        block(['removed', '- container', '- pipeline'], ['added', '+ bigquery', '+ pipeline:write'])
      )
    );
  });

  it('names a field once, whatever media types the change was reported for', () => {
    const lines = describeChanges(
      ['application/json', 'application/cbor', 'application/x-amz-json-1.1'].map((type) =>
        change(
          'response-optional-property-added',
          `added the optional property \`DocumentIdentifiers/items/CloudProviders\` to the response with the \`200\` status (media type: ${type})`
        )
      )
    );

    expect(lines.filter((line) => line.startsWith('+'))).toEqual([
      '+ DocumentIdentifiers/CloudProviders',
    ]);
  });

  it('says whether what was removed was in the request or the response', () => {
    const lines = describeChanges([
      change('request-property-removed', 'removed the request property `query/limit`'),
      change(
        'response-optional-property-removed',
        'removed the optional property `count` from the response with the `200` status'
      ),
      change('request-parameter-removed', 'deleted the `query` request parameter `alertId`'),
      change('api-schema-removed', 'removed the schema `statusGroupFilter`'),
    ]);

    expect(lines).toEqual(
      cellOf(
        ['**Response fields**'],
        block(['removed', '- count']),
        ['**Request fields**'],
        block(['removed', '- query/limit']),
        ['**Request parameters**'],
        block(['removed', '- alertId']),
        ['**Schemas**'],
        block(['removed', '- statusGroupFilter'])
      )
    );
  });

  it('names a parameter, not its location', () => {
    expect(
      describeChanges([
        change(
          'new-optional-request-parameter',
          'added the new optional `query` request parameter `preferFieldAssociatedErrors`'
        ),
      ])
    ).toEqual(
      cellOf(['**Request parameters**'], block(['added', '+ preferFieldAssociatedErrors']))
    );
  });

  it('counts schema variants instead of naming them', () => {
    expect(
      describeChanges([
        change(
          'request-property-one-of-added',
          'added `#/components/schemas/A` to the `q` request property `oneOf` list (media type: application/json)'
        ),
        change(
          'request-property-one-of-added',
          'added `#/components/schemas/A` to the `q` request property `oneOf` list (media type: application/x-www-form-urlencoded)'
        ),
        change(
          'response-property-discriminator-mapping-added',
          'added `#microsoft.graph.x` discriminator mapping keys to the `y` response property'
        ),
      ])
    ).toEqual(cellOf(['**Schema variants**'], block(['changed', '! 2 changes'])));
  });

  it('names new error responses', () => {
    expect(
      describeChanges([
        change(
          'response-non-success-status-added',
          'added the non-success response with the status `422`'
        ),
      ])
    ).toEqual(cellOf(['**Error responses**'], block(['added', '+ 422'])));
  });

  it.each([
    [
      'response-property-type-specialized',
      "the `x` response's property `type` was narrowed from `any` to `object` for status `200`",
      '! x (any → object)',
    ],
    [
      'request-property-default-value-changed',
      'the `x` request property default value changed from `false` to `true`',
      '! x (default false → true)',
    ],
    [
      'response-property-became-optional',
      'the response property `x` became optional for the status `200`',
      '! x (now optional)',
    ],
    [
      'request-property-became-nullable',
      'the request property `x` became nullable',
      '! x (now nullable)',
    ],
    [
      'response-property-list-of-types-narrowed',
      'response property `x` list-of-types was narrowed by removing types `null` from media type `application/json` of response `200`',
      '! x (no longer null)',
    ],
    [
      'request-property-min-set',
      "the `x` request property's min was set to `1.00`",
      '! x (min set to 1.00)',
    ],
    [
      'response-property-max-items-unset',
      "the `x` response property's maxItems was unset from `1` for the response status `200`",
      '! x (maxItems unset)',
    ],
  ])('says what changed about a field: %s', (id, text, expected) => {
    expect(describeChanges([change(id, text)])).toContain(expected);
  });

  it('keeps the rule of a change it has no words for', () => {
    expect(
      describeChanges([
        change('something-new', 'x'),
        change('something-new', 'y'),
        change('other-rule', 'z'),
      ])
    ).toEqual(cellOf(['**Other**'], block(['changed', '! something-new ×2', '! other-rule'])));
  });

  it('cuts a long path at its start, keeping the field', () => {
    const line = describeChanges([
      change(
        'response-optional-property-added',
        `added the optional property \`${'section/'.repeat(20)}finalField\` to the response`
      ),
    ]).find((found) => found.startsWith('+'));

    expect(line).toMatch(/^\+ ….*section\/finalField$/);
    expect(line?.length).toBeLessThan(90);
  });

  it('keeps an enum value whole when the field it is on is long', () => {
    const line = describeChanges([
      change(
        'response-property-enum-value-added',
        `added the new \`SPECIFIC\` enum value to the \`${'section/'.repeat(
          20
        )}driver\` response property`
      ),
    ]).find((found) => found.startsWith('+'));

    expect(line).toMatch(/^\+ SPECIFIC \(….*section\/driver\)$/);
  });
});
