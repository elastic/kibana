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
  it('describes the changes to a GKE endpoint as a diff, most important first', () => {
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
      scheme('api-security-removed', ['cloud-platform', 'container']),
      scheme('api-security-added', ['cloud-platform']),
      scheme('api-security-added', ['container']),
    ]);

    expect(lines).toEqual([
      '! deprecated clusters/securityPostureConfig/vulnerabilityMode',
      '+ enum value MIGRATE_TO_ADVANCED_DATAPATH on clusters/networkConfig/datapathProvider',
      '+ response field clusters/addonsConfig/wizSensorConfig',
      '+ response field clusters/networkConfig/ambientNetworkingConfig',
      '  auth scopes regrouped, same scopes',
    ]);
  });

  it('shows the first three names of a kind and counts the rest', () => {
    const lines = describeChanges(
      ['a', 'b', 'c', 'd', 'e'].map((name) =>
        change('response-optional-property-added', `added the optional property \`${name}\``)
      )
    );

    expect(lines).toEqual([
      '+ response field a',
      '+ response field b',
      '+ response field c',
      '  … and 2 more response fields',
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
      '+ auth scope bigquery',
      '+ auth scope pipeline:write',
      '- auth scope container',
      '- auth scope pipeline',
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
    ).toEqual(['+ response field DocumentIdentifiers/CloudProviders']);
  });

  it('says whether what was removed was in the request or the response', () => {
    expect(
      describeChanges([
        change('request-property-removed', 'removed the request property `query/limit`'),
        change(
          'response-optional-property-removed',
          'removed the optional property `count` from the response with the `200` status'
        ),
        change('request-parameter-removed', 'deleted the `query` request parameter `alertId`'),
        change('api-schema-removed', 'removed the schema `statusGroupFilter`'),
      ])
    ).toEqual([
      '- request field query/limit',
      '- request parameter alertId',
      '- response field count',
      '- schema statusGroupFilter',
    ]);
  });

  it('names a parameter, not its location', () => {
    expect(
      describeChanges([
        change(
          'new-optional-request-parameter',
          'added the new optional `query` request parameter `preferFieldAssociatedErrors`'
        ),
      ])
    ).toEqual(['+ request parameter preferFieldAssociatedErrors']);
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
    ).toEqual(['! schema variants changed (2)']);
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
    ).toEqual(['! changed order_by', '! changed page_size', '+ error response 422']);
  });

  it('keeps the rule of a change it has no words for', () => {
    expect(
      describeChanges([
        change('something-new', 'x'),
        change('something-new', 'y'),
        change('other-rule', 'z'),
      ])
    ).toEqual(['! something-new ×2', '! other-rule']);
  });

  it('cuts a long path at its start, keeping the field', () => {
    const [line] = describeChanges([
      change(
        'response-optional-property-added',
        `added the optional property \`${'section/'.repeat(20)}finalField\` to the response`
      ),
    ]);

    expect(line).toMatch(/^\+ response field ….*section\/finalField$/);
    expect(line.length).toBeLessThan(110);
  });

  it('keeps an enum value whole when the field it is on is long', () => {
    const [line] = describeChanges([
      change(
        'response-property-enum-value-added',
        `added the new \`SPECIFIC\` enum value to the \`${'section/'.repeat(
          20
        )}driver\` response property`
      ),
    ]);

    expect(line).toMatch(/^\+ enum value SPECIFIC on ….*section\/driver$/);
  });
});
