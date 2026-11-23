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

const change = (id: string, text: string, type?: string, typeBefore?: string): SpecChange => ({
  kind: 'non-breaking',
  id,
  text,
  ...(type === undefined ? {} : { type }),
  ...(typeBefore === undefined ? {} : { typeBefore }),
});
const scheme = (id: string, scopes: string[]) =>
  change(
    id,
    `the endpoint scheme security \`Oauth2: [${scopes
      .map((scope) => `https://www.googleapis.com/auth/${scope}`)
      .join(', ')}]\` was ${id.endsWith('-added') ? 'added to' : 'removed from'} the API`
  );

// What the cell has for an area: its heading and the lines of what changed.
const object = (area: string, ...lines: string[]): string[] => [
  `**${area}**`,
  '```diff',
  ...lines,
  '```',
];
const areas = (...parts: string[][]): string[] =>
  parts.flatMap((part, index) => (index === 0 ? part : ['', ...part]));

describe('describeChanges', () => {
  it('shows the response with the fields that were added, removed and changed', () => {
    const lines = describeChanges([
      change(
        'response-optional-property-added',
        'added the optional property `style/fontVariantPosition` to the response with the `200` status',
        'NORMAL | SUPER | SUB'
      ),
      change(
        'response-optional-property-removed',
        'removed the optional property `custom_attributes/key` from the response with the `200` status',
        'string'
      ),
      change(
        'response-property-one-of-added',
        'added `#/components/schemas/SlotContentId` to the `children/items/value` response property `oneOf` list for the response status `200`',
        'boolean | string | SlotContentId'
      ),
      change(
        'response-property-deprecated',
        'response property `securityPostureConfig/vulnerabilityMode` deprecated',
        'string'
      ),
    ]);

    expect(lines).toEqual(
      object(
        'Response',
        '- key: string',
        '+ fontVariantPosition: NORMAL | SUPER | SUB',
        '! value: boolean | string | SlotContentId',
        '! vulnerabilityMode: string (deprecated)'
      )
    );
  });

  it('shows the request, and the response after it', () => {
    const lines = describeChanges([
      change(
        'response-optional-property-added',
        'added the optional property `a` to the response with the `200` status',
        'string'
      ),
      change(
        'new-optional-request-property',
        'added the new optional request property `status`',
        'string'
      ),
    ]);

    expect(lines).toEqual(
      areas(object('Response', '+ a: string'), object('Request', '+ status: string'))
    );
  });

  it('shows the values of an enum that got a new one, or the new value when the type is unknown', () => {
    expect(
      describeChanges([
        change(
          'response-property-enum-value-added',
          'added the new `SLOT` enum value to the `children/items/type` response property for the response status `200`',
          'BOOLEAN | TEXT | SLOT'
        ),
      ])
    ).toEqual(object('Response', '! type: BOOLEAN | TEXT | SLOT'));
    expect(
      describeChanges([
        change(
          'response-property-enum-value-added',
          'added the new `SLOT` enum value to the `type` response property for the response status `200`'
        ),
      ])
    ).toEqual(object('Response', '! type (+ SLOT)'));
  });

  it('also names the value that changed when the type of an enum was cut short', () => {
    expect(
      describeChanges([
        change(
          'response-property-enum-value-added',
          'added the new `MIGRATE_TO_ADVANCED_DATAPATH` enum value to the `networkConfig/datapathProvider` response property for the response status `200`',
          'UNSPECIFIED | LEGACY_DATAPATH | ADVANCED_DATAPATH | MIGRATE_T…'
        ),
      ])
    ).toEqual(
      object(
        'Response',
        '! datapathProvider: UNSPECIFIED | LEGACY_DATAPATH | ADVANCED_DATAPATH | MIGRATE_T… (+ MIGRATE_TO_ADVANCED_DATAPATH)'
      )
    );
  });

  it('shows what a changed field was and what it is, as a line removed and a line added', () => {
    const lines = describeChanges([
      change(
        'response-optional-property-added',
        'added the optional property `fontVariantPosition` to the response with the `200` status',
        'NORMAL | SUPER | SUB'
      ),
      change(
        'response-property-one-of-added',
        'added `#/components/schemas/SlotContentId` to the `a/defaultValue` response property `oneOf` list for the response status `200`',
        'boolean | string | SlotContentId',
        'boolean | string'
      ),
      change(
        'response-property-one-of-added',
        'added `#/components/schemas/SlotContentId` to the `b/value` response property `oneOf` list for the response status `200`',
        'boolean | string | SlotContentId',
        'boolean | string'
      ),
      change(
        'response-property-enum-value-added',
        'added the new `SLOT` enum value to the `a/type` response property for the response status `200`',
        'BOOLEAN | TEXT | SLOT',
        'BOOLEAN | TEXT'
      ),
    ]);

    expect(lines).toEqual(
      object(
        'Response',
        '+ fontVariantPosition: NORMAL | SUPER | SUB',
        '- defaultValue: boolean | string',
        '+ defaultValue: boolean | string | SlotContentId',
        '- type: BOOLEAN | TEXT',
        '+ type: BOOLEAN | TEXT | SLOT',
        '- value: boolean | string',
        '+ value: boolean | string | SlotContentId'
      )
    );
  });

  it('counts a changed field, which takes two lines, as one when it cuts the list', () => {
    const lines = describeChanges(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map((name) =>
        change(
          'response-property-type-changed',
          `the \`${name}\` response's property \`type\` changed from \`string\` to \`integer\` for status \`200\``,
          'integer',
          'string'
        )
      )
    );

    expect(lines.filter((line) => line.startsWith('- '))).toHaveLength(10);
    expect(lines[lines.length - 1]).toBe('```');
    expect(lines[lines.length - 2]).toBe('  … and 2 more changed');
  });

  it('keeps one line for a change that leaves the type as it was, with what changed in brackets', () => {
    expect(
      describeChanges([
        change(
          'response-property-became-required',
          'the response property `tags` became required for the status `200`',
          'string[]',
          'string[]'
        ),
      ])
    ).toEqual(object('Response', '! tags: string[] (now required)'));
  });

  it('shows nullability in the two lines and not again in brackets', () => {
    expect(
      describeChanges([
        change(
          'request-parameter-became-not-nullable',
          'the `query` request parameter `branch` became not nullable',
          'string',
          'string | null'
        ),
      ])
    ).toEqual(object('Request', '- branch: string | null', '+ branch: string (query parameter)'));
  });

  it('does not say in brackets what the two lines already say', () => {
    expect(
      describeChanges([
        change(
          'response-property-type-changed',
          "the `x` response's property `type` changed from `object` to `string` for status `200`",
          'string',
          'object'
        ),
        change(
          'response-property-became-required',
          'the response property `x` became required for the status `200`',
          'string',
          'object'
        ),
      ])
    ).toEqual(object('Response', '- x: object', '+ x: string (now required)'));
  });

  it('shows keys added to the base a field extends by that base, with the type of the field', () => {
    const added = (keys: string) =>
      change(
        'response-property-discriminator-mapping-added',
        `added \`${keys}\` discriminator mapping keys to the \`calendarView/items/allOf[#/components/schemas/outlookItem]\` response property`,
        'microsoft.graph.event[]',
        'microsoft.graph.event[]'
      );

    expect(
      describeChanges([
        added('#microsoft.graph.a, #microsoft.graph.b'),
        added('#microsoft.graph.b, #microsoft.graph.c, #microsoft.graph.d'),
      ])
    ).toEqual(
      object(
        'Response',
        '! calendarView: microsoft.graph.event[] (outlookItem: + microsoft.graph.a, microsoft.graph.b, microsoft.graph.c and 1 more)'
      )
    );
  });

  it('shows the concrete types a field lost as the ones it had', () => {
    expect(
      describeChanges([
        change(
          'request-property-discriminator-mapping-deleted',
          'removed `ExperimentFunnelsQuery, ExperimentTrendsQuery` discriminator mapping keys from the `query/oneOf[subschema #49: DataTableNode -> subschema #50: DataTableNode]/source` request property (media type: application/json)'
        ),
      ])
    ).toEqual(
      object(
        'Request',
        '- source: object | ExperimentFunnelsQuery | ExperimentTrendsQuery',
        '+ source: object'
      )
    );
  });

  it('shows keys added to the base the response body extends as a change of the body', () => {
    expect(
      describeChanges([
        change(
          'response-property-discriminator-mapping-added',
          'added `#microsoft.graph.group` discriminator mapping keys to the `allOf[#/components/schemas/microsoft.graph.baseItem]/allOf[subschema #1: entity]` response property',
          'microsoft.graph.site',
          'microsoft.graph.site'
        ),
      ])
    ).toEqual(
      object(
        'Response',
        '! (response body): microsoft.graph.site (entity: + microsoft.graph.group)'
      )
    );
  });

  it('shows keys added to a choice of what a field can be as the types it can now be', () => {
    expect(
      describeChanges([
        change(
          'response-property-discriminator-mapping-added',
          'added `#microsoft.graph.group` discriminator mapping keys to the `value/items/hits/items/resource/anyOf[subschema #1: entity]` response property',
          'object',
          'object'
        ),
      ])
    ).toEqual(
      object('Response', '- resource: entity', '+ resource: entity | microsoft.graph.group')
    );
  });

  it('shows the type of a field that gained a variant, or the variants when the type is unknown', () => {
    expect(
      describeChanges([
        change(
          'request-property-one-of-added',
          'added `#/components/schemas/A, #/components/schemas/B, #/components/schemas/C, #/components/schemas/D` to the `query/source` request property `oneOf` list (media type: application/json)'
        ),
        change(
          'response-property-discriminator-mapping-added',
          'added `#microsoft.graph.group` discriminator mapping keys to the `value/resource` response property'
        ),
        change(
          'response-body-any-of-removed',
          'removed `#/components/schemas/Q1` from the response body `anyOf` list for the response status `200`'
        ),
      ])
    ).toEqual(
      areas(
        object(
          'Response',
          '! (response body) (- Q1)',
          '- resource: object',
          '+ resource: object | microsoft.graph.group'
        ),
        object('Request', '! source (+ A, B, C and 1 more)')
      )
    );
  });

  it('puts every change of a field on one line, with the location of a parameter first', () => {
    const lines = describeChanges([
      change(
        'request-parameter-min-length-set',
        'for the `query` request parameter `branch`, the minLength was set to `1`',
        'string'
      ),
      change(
        'request-parameter-became-not-nullable',
        'the `query` request parameter `branch` became not nullable',
        'string'
      ),
    ]);

    expect(lines).toEqual(
      object(
        'Request',
        '! branch: string (query parameter, minLength set to 1, no longer nullable)'
      )
    );
  });

  it('says what a type changed from when it shows the new one, or both when it cannot', () => {
    const text =
      "the `custom_attributes` response's property `type` changed from `object` to `string` for status `200`";
    expect(describeChanges([change('response-property-type-changed', text, 'string')])).toEqual(
      object('Response', '! custom_attributes: string (was object)')
    );
    expect(describeChanges([change('response-property-type-changed', text)])).toEqual(
      object('Response', '! custom_attributes (object → string)')
    );
  });

  it('shows the first ten names of a kind and counts the rest', () => {
    const lines = describeChanges(
      ['l', 'a', 'k', 'b', 'j', 'c', 'i', 'd', 'h', 'e', 'g', 'f'].map((name) =>
        change(
          'response-optional-property-added',
          `added the optional property \`${name}\` to the response with the \`200\` status`,
          'string'
        )
      )
    );

    expect(lines).toEqual(
      object(
        'Response',
        ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((name) => `+ ${name}: string`),
        '  … and 2 more added'
      )
    );
  });

  it('names a field once, whatever media types the change was reported for', () => {
    const lines = describeChanges(
      ['application/json', 'application/cbor', 'application/x-amz-json-1.1'].map((type) =>
        change(
          'response-optional-property-added',
          `added the optional property \`DocumentIdentifiers/items/CloudProviders\` to the response with the \`200\` status (media type: ${type})`,
          'string'
        )
      )
    );

    expect(lines).toEqual(object('Response', '+ CloudProviders: string'));
  });

  it('says whether what was removed was in the request or the response', () => {
    const lines = describeChanges([
      change('request-property-removed', 'removed the request property `query/limit`', 'integer'),
      change(
        'response-optional-property-removed',
        'removed the optional property `count` from the response with the `200` status',
        'integer'
      ),
      change('request-parameter-removed', 'deleted the `query` request parameter `alertId`'),
      change('api-schema-removed', 'removed the schema `statusGroupFilter`'),
    ]);

    expect(lines).toEqual(
      areas(
        object('Response', '- count: integer'),
        object('Request', '- alertId (query parameter)', '- limit: integer'),
        object('Schemas', '- statusGroupFilter')
      )
    );
  });

  it('names the scopes that were really added or removed, or that nothing changed but their order', () => {
    expect(
      describeChanges([
        scheme('api-security-removed', ['cloud-platform', 'container']),
        scheme('api-security-added', ['cloud-platform']),
        scheme('api-security-added', ['bigquery']),
      ])
    ).toEqual(object('Auth scopes', '- container', '+ bigquery'));
    expect(
      describeChanges([
        scheme('api-security-removed', ['cloud-platform', 'container']),
        scheme('api-security-added', ['cloud-platform']),
        scheme('api-security-added', ['container']),
      ])
    ).toEqual(object('Auth scopes', '! same scopes, regrouped'));
  });

  it('names a scheme without scopes that was added, rather than saying nothing changed', () => {
    expect(
      describeChanges([
        change('api-security-added', 'the endpoint scheme security `apiKey` was added to the API'),
      ])
    ).toEqual(object('Auth scopes', '+ apiKey (scheme)'));
    expect(
      describeChanges([
        change('api-security-component-added', 'the component security scheme `apiKey` was added'),
      ])
    ).toEqual(object('Auth scopes', '+ apiKey (scheme)'));
  });

  it('compares scopes whole, and names them whole when their short names would be the same', () => {
    expect(
      describeChanges([
        change(
          'api-security-removed',
          'the endpoint scheme security `Oauth2: [https://old.example/auth/read]` was removed from the API'
        ),
        change(
          'api-security-added',
          'the endpoint scheme security `Oauth2: [https://new.example/auth/read]` was added to the API'
        ),
      ])
    ).toEqual(
      object('Auth scopes', '- https://old.example/auth/read', '+ https://new.example/auth/read')
    );
  });

  it('names a scope that is a URL ending in a slash by its host', () => {
    expect(
      describeChanges([
        change(
          'api-security-removed',
          'the endpoint scheme security `Oauth2: [https://mail.google.com/, https://x/auth/gmail.labels]` was removed from the API'
        ),
        change(
          'api-security-added',
          'the endpoint scheme security `Oauth2: [https://mail.google.com/]` was added to the API'
        ),
      ])
    ).toEqual(object('Auth scopes', '- gmail.labels'));
    expect(
      describeChanges([
        change(
          'api-security-added',
          'the endpoint scheme security `Oauth2: [https://mail.google.com/]` was added to the API'
        ),
      ])
    ).toEqual(object('Auth scopes', '+ mail.google.com'));
  });

  it('names the scheme of a scope when the same scopes moved to another scheme', () => {
    expect(
      describeChanges([
        change(
          'api-security-removed',
          'the endpoint scheme security `Oauth2: [https://x/auth/a]` was removed from the API'
        ),
        change(
          'api-security-added',
          'the endpoint scheme security `OAuthV2: [https://x/auth/a]` was added to the API'
        ),
      ])
    ).toEqual(object('Auth scopes', '- a (Oauth2)', '+ a (OAuthV2)'));
  });

  it('reads the scope a scheme gained from its own rules', () => {
    expect(
      describeChanges([
        change(
          'api-security-scope-added',
          "the security scope `pipeline:write` was added to the endpoint's security scheme `oauth2`"
        ),
        change(
          'api-security-component-oauth-scope-added',
          'the component security scheme `oauth2` oauth `clientCredentials` flow scope `write` was added'
        ),
      ])
    ).toEqual(object('Auth scopes', '+ pipeline:write', '+ write'));
  });

  it('counts the scopes left out of a long list as added', () => {
    const lines = describeChanges([
      scheme(
        'api-security-added',
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map(
          (scope) => `scope-${scope}`
        )
      ),
    ]);

    expect(lines.slice(-3)).toEqual(['+ scope-j', '  … and 2 more added', '```']);
  });

  it('names new error responses', () => {
    expect(
      describeChanges([
        change(
          'response-non-success-status-added',
          'added the non-success response with the status `422`'
        ),
      ])
    ).toEqual(object('Error responses', '+ 422'));
  });

  it('names removed error responses', () => {
    expect(
      describeChanges([
        change(
          'response-non-success-status-removed',
          'removed the non-success response with the status `404`'
        ),
      ])
    ).toEqual(object('Error responses', '- 404'));
  });

  it('names a parameter that got an enum value by its name and location', () => {
    expect(
      describeChanges([
        change(
          'request-parameter-enum-value-added',
          'added the new enum value `archived` to the `query` request parameter `status`',
          'open | closed | archived',
          'open | closed'
        ),
      ])
    ).toEqual(
      object(
        'Request',
        '- status: open | closed',
        '+ status: open | closed | archived (query parameter)'
      )
    );
  });

  it('names the parameter when its new enum value looks like a location', () => {
    expect(
      describeChanges([
        change(
          'request-parameter-enum-value-added',
          'added the new enum value `header` to the `query` request parameter `status`'
        ),
      ])
    ).toEqual(object('Request', '! status (query parameter, + header)'));
  });

  it('says that an enum value of the request body is in the request body', () => {
    expect(
      describeChanges([
        change('request-body-enum-value-added', 'request body enum value added `z`'),
      ])
    ).toEqual(object('Request', '! (request body) (+ z)'));
  });

  it('says how a bound moved, and keeps the rule of a field change it has no words for', () => {
    expect(
      describeChanges([
        change(
          'request-parameter-max-decreased',
          'for the `query` request parameter `limit`, the max was decreased from `100.00` to `50.00`',
          'integer'
        ),
        change(
          'request-property-max-properties-increased',
          'the `filter` request property max properties was increased',
          'object'
        ),
      ])
    ).toEqual(
      object(
        'Request',
        '! filter: object (max properties increased)',
        '! limit: integer (query parameter, max 100.00 → 50.00)'
      )
    );
  });

  it('reads how a bound of the response moved, not the status after it', () => {
    expect(
      describeChanges([
        change(
          'response-property-max-increased',
          "the `count` response property's max was increased from `1.00` to `2.00` for the response status `200`",
          'integer'
        ),
      ])
    ).toEqual(object('Response', '! count: integer (max 1.00 → 2.00)'));
  });

  it('keeps an MCP property name that holds a space', () => {
    expect(
      describeChanges([
        change('mcp-input-property-added', 'search: input.display name was added', 'string'),
        change('mcp-output-type-changed', 'search: output.display name type changed'),
      ])
    ).toEqual(
      areas(
        object('Response', '! display name (type changed)'),
        object('Request', '+ display name: string')
      )
    );
  });

  it('keeps the value that changed when the types are cut short', () => {
    expect(
      describeChanges([
        change(
          'response-property-enum-value-removed',
          'removed the `a` enum value from the `mode` response property for the response status `200`',
          'b | c | …',
          'a | b | …'
        ),
      ])
    ).toEqual(object('Response', '- mode: a | b | …', '+ mode: b | c | … (- a)'));
  });

  it('keeps parameters of the same name in different locations apart', () => {
    const lines = describeChanges([
      change(
        'new-optional-request-parameter',
        'added the new optional `query` request parameter `token`',
        'string'
      ),
      change(
        'new-optional-request-parameter',
        'added the new optional `header` request parameter `token`',
        'string'
      ),
    ]);

    expect(lines).toEqual(
      object('Request', '+ token: string (header parameter)', '+ token: string (query parameter)')
    );
  });

  it('keeps a value with line breaks on one line of the diff', () => {
    const lines = describeChanges([
      change(
        'response-optional-property-added',
        'added the optional property `note` to the response with the `200` status',
        'a\n```\nb'
      ),
    ]);

    expect(lines).toEqual(object('Response', '+ note: a\\n```\\nb'));
  });

  it("shows an MCP tool's input and output as the request and the response", () => {
    expect(
      describeChanges([
        change('mcp-input-property-added', 'search: input.limit was added', 'integer'),
        change('mcp-output-type-changed', 'search: output.items[] type changed'),
      ])
    ).toEqual(
      areas(object('Response', '! items (type changed)'), object('Request', '+ limit: integer'))
    );
  });

  it('keeps the text of a GraphQL or MCP change it has no words for', () => {
    expect(
      describeChanges([
        change('mcp-read-only-changed', 'search: its readOnlyHint changed'),
        change('FIELD_ADDED', 'Field "Board.url" was added to object type "Board".'),
      ])
    ).toEqual(
      object(
        'Other',
        '! Field "Board.url" was added to object type "Board".',
        '! search: its readOnlyHint changed'
      )
    );
  });

  it('shows the first ten GraphQL or MCP texts it has no words for and counts the rest', () => {
    const lines = describeChanges(
      Array.from({ length: 12 }, (_, index) =>
        change('FIELD_ADDED', `Field "Board.f${String(index).padStart(2, '0')}" was added.`)
      )
    );

    expect(lines.slice(-4)).toEqual([
      '! Field "Board.f08" was added.',
      '! Field "Board.f09" was added.',
      '  … and 2 more changed',
      '```',
    ]);
  });

  it('keeps the rule of a change it has no words for', () => {
    expect(
      describeChanges([
        change('something-new', 'x'),
        change('something-new', 'y'),
        change('other-rule', 'z'),
      ])
    ).toEqual(object('Other', '! something-new ×2', '! other-rule'));
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

  it('names a field by its own name, wherever it sits in the schema', () => {
    expect(
      describeChanges([
        change(
          'response-optional-property-added',
          `added the optional property \`${'section/'.repeat(
            20
          )}finalField\` to the response with the \`200\` status`,
          'string'
        ),
      ])
    ).toEqual(object('Response', '+ finalField: string'));
  });

  it('keeps the name of a map for the values it holds', () => {
    expect(
      describeChanges([
        change(
          'response-optional-property-added',
          'added the optional property `a/labels/additionalProperties` to the response with the `200` status',
          'string'
        ),
      ])
    ).toEqual(object('Response', '+ labels/additionalProperties: string'));
  });

  it('shows fields of the same name and type once, and those of another type apart', () => {
    const added = (path: string, type: string) =>
      change(
        'response-optional-property-added',
        `added the optional property \`${path}\` to the response with the \`200\` status`,
        type
      );

    expect(
      describeChanges([
        added('a/style/value', 'string'),
        added('b/other/value', 'string'),
        added('c/value', 'integer'),
      ])
    ).toEqual(object('Response', '+ value: integer', '+ value: string'));
  });
});
