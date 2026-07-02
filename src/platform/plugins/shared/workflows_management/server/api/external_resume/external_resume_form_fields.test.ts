/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import {
  buildExternalResumeFormFieldsHtml,
  parseExternalResumeFormBody,
  validateExternalResumeInput,
} from './external_resume_form_fields';

const ARRAY_ENUM_SCHEMA: JsonModelSchemaType = {
  type: 'object',
  properties: {
    tactics: {
      type: 'array',
      title: 'Tactics',
      items: {
        type: 'string',
        enum: ['initial_access', 'execution', 'persistence'],
      },
    },
  },
  required: ['tactics'],
};

describe('external_resume_form_fields', () => {
  describe('array-of-enum fields', () => {
    it('renders a multi-select for array items with enum', () => {
      const html = buildExternalResumeFormFieldsHtml(ARRAY_ENUM_SCHEMA);

      expect(html).toContain('<select id="tactics" name="tactics" multiple required>');
      expect(html).toContain('<option value="initial_access">initial_access</option>');
      expect(html).not.toContain('<input type="text" id="tactics"');
    });

    it('parses and validates multiple selected enum values', () => {
      const parsed = parseExternalResumeFormBody(
        { tactics: ['initial_access', 'execution'] },
        ARRAY_ENUM_SCHEMA
      );
      const validated = validateExternalResumeInput(parsed, ARRAY_ENUM_SCHEMA);

      expect(validated).toEqual({ tactics: ['initial_access', 'execution'] });
    });

    it('parses a single selected enum value as a one-element array', () => {
      const parsed = parseExternalResumeFormBody({ tactics: 'persistence' }, ARRAY_ENUM_SCHEMA);
      const validated = validateExternalResumeInput(parsed, ARRAY_ENUM_SCHEMA);

      expect(validated).toEqual({ tactics: ['persistence'] });
    });
  });
});
