/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLCallbacks,
  ESQLFieldWithMetadata,
  PartialFieldsMetadataClient,
} from '@kbn/esql-types';
import { setup } from './helpers';
import { SuggestionCategory } from '../utils';

const fields: ESQLFieldWithMetadata[] = [
  { name: 'other.field', type: 'keyword', userDefined: false },
  { name: 'ecs.field', type: 'keyword', userDefined: false },
  { name: 'ecs.type_mismatch.field', type: 'boolean', userDefined: false },
];

const mockGetFieldsMetadata = (_fields: Record<string, { type: string }>) =>
  Promise.resolve<PartialFieldsMetadataClient>({
    find: jest.fn().mockResolvedValue({
      fields: _fields,
    }),
  });

describe('ecs suggestions', () => {
  const callbacks: Partial<ESQLCallbacks> = {
    getColumnsFor: jest.fn(() => fields),
    getFieldsMetadata: mockGetFieldsMetadata({
      'ecs.field': { type: 'keyword' },
      'ecs.type_mismatch.field': { type: 'keyword' }, // orignal type is boolean
    }),
  };

  it('differentiate ECS fields in a different category than other fields', async () => {
    const { assertSuggestions } = await setup('^');
    await assertSuggestions(
      'FROM index | KEEP ^',
      [
        {
          text: 'ecs.field',
          category: SuggestionCategory.ECS_FIELD,
        },
        {
          text: 'other.field',
          category: SuggestionCategory.FIELD,
        },
        'ecs.type_mismatch.field',
      ],
      { callbacks }
    );
  });

  it('does not recognize ECS field if the type does not match with the field metadata', async () => {
    const { assertSuggestions } = await setup('^');
    await assertSuggestions(
      'FROM index | KEEP ^',
      [
        'ecs.field',
        'other.field',
        {
          text: 'ecs.type_mismatch.field',
          category: SuggestionCategory.FIELD,
        },
      ],
      {
        callbacks,
      }
    );
  });
});
