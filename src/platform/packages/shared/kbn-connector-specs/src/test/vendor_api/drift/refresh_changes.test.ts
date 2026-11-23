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

describe('describeChanges', () => {
  it('describes the changes to a GKE endpoint in words, most important first', () => {
    const lines = describeChanges([
      change(
        'response-optional-property-added',
        'added the optional property `clusters/items/addonsConfig/wizSensorConfig` to the response with the `200` status'
      ),
      change(
        'response-optional-property-added',
        'added the optional property `clusters/items/networkConfig/ambientNetworkingConfig` to the response with the `200` status'
      ),
      change(
        'response-property-deprecated',
        'response property `clusters/items/securityPostureConfig/vulnerabilityMode` deprecated'
      ),
      change(
        'response-property-enum-value-added',
        'added the new `MIGRATE_TO_ADVANCED_DATAPATH` enum value to the `clusters/items/networkConfig/datapathProvider` response property for the response status `200`'
      ),
      change(
        'response-property-enum-value-added',
        'added the new `MIGRATE_TO_LEGACY_DATAPATH` enum value to the `clusters/items/networkConfig/datapathProvider` response property for the response status `200`'
      ),
      scheme('api-security-removed', ['cloud-platform', 'container']),
      scheme('api-security-added', ['cloud-platform']),
      scheme('api-security-added', ['container']),
    ]);

    expect(lines).toEqual([
      '**Deprecated:** `clusters/securityPostureConfig/vulnerabilityMode`',
      '**New enum values:** `MIGRATE_TO_ADVANCED_DATAPATH`, `MIGRATE_TO_LEGACY_DATAPATH` on `clusters/networkConfig/datapathProvider`',
      '**New response fields:** `clusters/addonsConfig/wizSensorConfig` and `clusters/networkConfig/ambientNetworkingConfig`',
      '**Auth scopes:** regrouped, same scopes',
    ]);
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
    ).toEqual([
      '**Auth scopes:** added `bigquery` and `pipeline:write`; removed `container` and `pipeline`',
    ]);
  });

  it('names a field once, whatever media types the change was reported for', () => {
    expect(
      describeChanges(
        ['application/json', 'application/cbor', 'application/x-amz-json-1.1'].map((type) =>
          change(
            'response-optional-property-added',
            `added the optional property \`DocumentIdentifiers/items/CloudProviders\` to the response with the \`200\` status (media type: ${type})`
          )
        )
      )
    ).toEqual(['**New response fields:** `DocumentIdentifiers/CloudProviders`']);
  });

  it('names a parameter, not its location', () => {
    expect(
      describeChanges([
        change(
          'new-optional-request-parameter',
          'added the new optional `query` request parameter `preferFieldAssociatedErrors`'
        ),
        change('request-parameter-removed', 'deleted the `query` request parameter `alertId`'),
      ])
    ).toEqual(['**Removed:** `alertId`', '**New request fields:** `preferFieldAssociatedErrors`']);
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
    ).toEqual(['**Schema variants changed:** 2 changes']);
  });

  it('names new error responses and type or constraint changes', () => {
    expect(
      describeChanges([
        change(
          'response-non-success-status-added',
          'added the non-success response with the status `422`'
        ),
        change(
          'request-parameter-became-nullable',
          'the `query` request parameter `order_by` became nullable'
        ),
        change(
          'request-property-min-set',
          "the `page_size` request property's min was set to `1.00`"
        ),
      ])
    ).toEqual([
      '**Type or constraint changes:** `order_by` and `page_size`',
      '**New error responses:** `422`',
    ]);
  });

  it('keeps the rule of a change it has no words for', () => {
    expect(
      describeChanges([
        change('something-new', 'x'),
        change('something-new', 'y'),
        change('other-rule', 'z'),
      ])
    ).toEqual(['**Other:** `something-new` ×2, `other-rule`']);
  });

  it('cuts a long path at its start, keeping the field', () => {
    const [line] = describeChanges([
      change(
        'response-optional-property-added',
        `added the optional property \`${'section/'.repeat(12)}finalField\` to the response`
      ),
    ]);

    expect(line).toMatch(/^\*\*New response fields:\*\* `…[^`]*section\/finalField`$/);
    expect(line.length).toBeLessThan(120);
  });
});
