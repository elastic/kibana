/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { InstallFormValidationError } from './install_form_validation_error';
import { MissingInstallFormFieldError } from './missing_install_form_field_error';
import { parseTemplateYaml } from './parse_template';
import { renderInstall, validateInstallFormValues } from './render_install';
import type { InstallFormField } from '../types/install_form';

const TEMPLATE = `template-metadata:
  slug: ip-reputation-check
  version: "1.1.0"
  availability: ">=9.5.0 <9.6.0"
  name: "IP Reputation Check"
  description: "Assess the reputation of an IP address."
  categories: [enrichment]
  install:
    form:
      - name: abuseipdb-connector
        inputType: connector
        connectorType: .abuseipdb
        required: true
      - name: max-age-in-days
        inputType: number
        default: 30
      - name: note
        inputType: text

# a top-level body comment that must be preserved
consts:
  # nested body comment
  threshold: 50
steps:
  - name: query_abuseipdb
    type: abuseipdb.checkIp
    connector-id: __install__.abuseipdb-connector
    with:
      maxAgeInDays: __install__.max-age-in-days
      note: "prefix __install__.note suffix"
`;

const parseFixture = (raw: string = TEMPLATE) => parseTemplateYaml(raw);

const VALID_VALUES = {
  'abuseipdb-connector': 'my-connector-id',
  note: 'hello',
};

describe('renderInstall', () => {
  it('should substitute values, strip the metadata block, and preserve body comments', () => {
    const { yaml } = renderInstall({ template: parseFixture(), values: VALID_VALUES });

    expect(yaml).not.toContain('template-metadata');
    expect(yaml).not.toContain('__install__');
    expect(yaml).toContain('# a top-level body comment that must be preserved');
    expect(yaml).toContain('  # nested body comment');
    expect(yaml).toContain('connector-id: my-connector-id');
  });

  it('should apply form defaults and expose them in `resolved`', () => {
    const { yaml, resolved } = renderInstall({ template: parseFixture(), values: VALID_VALUES });

    expect(yaml).toContain('maxAgeInDays: 30');
    expect(resolved).toEqual({
      'abuseipdb-connector': 'my-connector-id',
      'max-age-in-days': 30,
      note: 'hello',
    });
  });

  it('should prefer a submitted value over the field default', () => {
    const { yaml } = renderInstall({
      template: parseFixture(),
      values: { ...VALID_VALUES, 'max-age-in-days': 7 },
    });

    expect(yaml).toContain('maxAgeInDays: 7');
    expect(yaml).not.toContain('maxAgeInDays: 30');
  });

  it('should interpolate placeholders inside longer strings and keep the quoting', () => {
    const { yaml } = renderInstall({ template: parseFixture(), values: VALID_VALUES });

    expect(yaml).toContain('note: "prefix hello suffix"');
  });

  it('should produce YAML whose parsed shape matches the substituted values', () => {
    const { yaml } = renderInstall({ template: parseFixture(), values: VALID_VALUES });
    const workflow = parse(yaml) as {
      steps: Array<{ 'connector-id': string; with: { maxAgeInDays: number; note: string } }>;
    };

    expect(workflow.steps[0]['connector-id']).toBe('my-connector-id');
    expect(workflow.steps[0].with.maxAgeInDays).toBe(30);
    expect(workflow.steps[0].with.note).toBe('prefix hello suffix');
  });

  it('should throw InstallFormValidationError when a required value is missing', () => {
    expect(() => renderInstall({ template: parseFixture(), values: { note: 'hello' } })).toThrow(
      InstallFormValidationError
    );

    try {
      renderInstall({ template: parseFixture(), values: { note: 'hello' } });
    } catch (error) {
      expect((error as InstallFormValidationError).errors).toEqual([
        { field: 'abuseipdb-connector', reason: 'A value is required.' },
      ]);
    }
  });

  it('should treat an empty string as a missing required value', () => {
    expect(() =>
      renderInstall({
        template: parseFixture(),
        values: { ...VALID_VALUES, 'abuseipdb-connector': '' },
      })
    ).toThrow(InstallFormValidationError);
  });

  it('should throw InstallFormValidationError on a type mismatch', () => {
    expect(() =>
      renderInstall({
        template: parseFixture(),
        values: { ...VALID_VALUES, 'max-age-in-days': 'not-a-number' },
      })
    ).toThrow(InstallFormValidationError);
  });

  it('should throw MissingInstallFormFieldError when the body references an undeclared field', () => {
    const raw = TEMPLATE.replace('__install__.note', '__install__.not-declared');
    expect(() => renderInstall({ template: parseFixture(raw), values: VALID_VALUES })).toThrow(
      MissingInstallFormFieldError
    );

    try {
      renderInstall({ template: parseFixture(raw), values: VALID_VALUES });
    } catch (error) {
      expect((error as MissingInstallFormFieldError).fields).toEqual(['not-declared']);
    }
  });

  it('should throw InstallFormValidationError when a referenced optional field has no value', () => {
    expect(() =>
      renderInstall({
        template: parseFixture(),
        values: { 'abuseipdb-connector': 'my-connector-id' },
      })
    ).toThrow(
      new InstallFormValidationError([
        { field: 'note', reason: 'Referenced by the template body but no value was provided.' },
      ])
    );
  });

  it('should substitute inside a block scalar in place, keeping the block style and the next key intact', () => {
    const raw = TEMPLATE.replace(
      'note: "prefix __install__.note suffix"',
      'note: |\n        line for __install__.note here\n        second line\n      other: value'
    );
    const { yaml } = renderInstall({ template: parseFixture(raw), values: VALID_VALUES });

    expect(yaml).toContain('note: |');
    expect(yaml).toContain('line for hello here');
    expect(yaml).toContain('second line');
    const workflow = parse(yaml) as {
      steps: Array<{ with: { note: string; other: string } }>;
    };
    expect(workflow.steps[0].with.note).toBe('line for hello here\nsecond line\n');
    expect(workflow.steps[0].with.other).toBe('value');
  });

  it('should re-encode a block scalar when a value is multiline, without breaking the next key', () => {
    const raw = TEMPLATE.replace(
      'note: "prefix __install__.note suffix"',
      'note: |\n        prefix __install__.note suffix\n      other: value'
    );
    const value = 'line one\nline two';
    const { yaml } = renderInstall({
      template: parseFixture(raw),
      values: { ...VALID_VALUES, note: value },
    });
    const workflow = parse(yaml) as {
      steps: Array<{ with: { note: string; other: string } }>;
    };

    // `|` block literals keep their final newline; the re-encode preserves it.
    expect(workflow.steps[0].with.note).toBe(`prefix ${value} suffix\n`);
    expect(workflow.steps[0].with.other).toBe('value');
  });

  it('should not touch placeholders in YAML comments', () => {
    const raw = TEMPLATE.replace('# nested body comment', '# see __install__.abuseipdb-connector');
    const { yaml } = renderInstall({ template: parseFixture(raw), values: VALID_VALUES });

    expect(yaml).toContain('# see __install__.abuseipdb-connector');
  });

  describe('YAML-safe encoding', () => {
    const render = (value: unknown) => {
      const { yaml } = renderInstall({
        template: parseFixture(),
        values: { ...VALID_VALUES, note: 'x', 'abuseipdb-connector': value },
      });
      return yaml;
    };
    const parsedConnectorId = (value: unknown) =>
      (parse(render(value)) as { steps: Array<{ 'connector-id': unknown }> }).steps[0][
        'connector-id'
      ];

    it('should emit bare-safe strings unquoted', () => {
      expect(render('my-connector-id')).toContain('connector-id: my-connector-id');
    });

    it('should quote a string containing a comment marker and round-trip it', () => {
      const value = 'bar #baz';
      expect(render(value)).toContain('connector-id: "bar #baz"');
      expect(parsedConnectorId(value)).toBe(value);
    });

    it('should quote a string that would parse as a mapping', () => {
      const value = 'foo: bar';
      expect(parsedConnectorId(value)).toBe(value);
    });

    it('should quote a multiline string and round-trip it', () => {
      const value = 'line one\nline two';
      expect(parsedConnectorId(value)).toBe(value);
    });

    it('should quote strings that would parse as another YAML type', () => {
      for (const value of ['true', '42', 'null']) {
        expect(parsedConnectorId(value)).toBe(value);
      }
    });

    it('should quote strings containing flow-collection delimiters', () => {
      const value = 'a,b';
      expect(parsedConnectorId(value)).toBe(value);
    });

    it('should keep a whole-scalar numeric value as a YAML number', () => {
      const { yaml } = renderInstall({
        template: parseFixture(),
        values: { ...VALID_VALUES, 'max-age-in-days': 90 },
      });
      const workflow = parse(yaml) as { steps: Array<{ with: { maxAgeInDays: unknown } }> };

      expect(yaml).toContain('maxAgeInDays: 90');
      expect(workflow.steps[0].with.maxAgeInDays).toBe(90);
    });
  });
});

describe('validateInstallFormValues', () => {
  const field = (overrides: Partial<InstallFormField> & Pick<InstallFormField, 'inputType'>) =>
    ({ name: 'the-field', ...overrides } as InstallFormField);

  it.each([
    ['text', field({ inputType: 'text' }), 'hello', 123],
    ['textarea', field({ inputType: 'textarea' }), 'hello', 123],
    ['number', field({ inputType: 'number' }), 42, 'nope'],
    ['boolean', field({ inputType: 'boolean' }), true, 'yes'],
    [
      'select',
      field({ inputType: 'select', options: [{ value: 'a', label: 'A' }] } as never),
      'a',
      'b',
    ],
    ['connector', field({ inputType: 'connector', connectorType: '.slack' } as never), 'id-1', 7],
    ['esIndex', field({ inputType: 'esIndex' }), 'logs-*', 7],
  ])(
    'should accept a valid %s value and reject an invalid one',
    (_type, formField, valid, invalid) => {
      expect(validateInstallFormValues([formField], { 'the-field': valid })).toEqual([]);

      const errors = validateInstallFormValues([formField], { 'the-field': invalid });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('the-field');
    }
  );

  it('should reject a non-finite number', () => {
    expect(
      validateInstallFormValues([field({ inputType: 'number' })], { 'the-field': Infinity })
    ).toHaveLength(1);
  });

  it('should skip a missing value on an optional field', () => {
    expect(validateInstallFormValues([field({ inputType: 'text' })], {})).toEqual([]);
  });

  it('should report a missing value on a required field', () => {
    expect(validateInstallFormValues([field({ inputType: 'text', required: true })], {})).toEqual([
      { field: 'the-field', reason: 'A value is required.' },
    ]);
  });

  it('should reject a blank connector ID', () => {
    expect(
      validateInstallFormValues(
        [field({ inputType: 'connector', connectorType: '.slack' } as never)],
        { 'the-field': '   ' }
      )
    ).toHaveLength(1);
  });
});
