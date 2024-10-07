/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentType } from './content_type';
import type { ContentTypeDefinition } from './content_type_definition';

test('create a content type with just an id', () => {
  const type = new ContentType({ id: 'test', version: { latest: 1 } });

  expect(type.id).toBe('test');
  expect(type.name).toBe('test');
  expect(type.icon).toBe('questionInCircle');
  expect(type.description).toBe('');
});

test('create a content type with all the full definition', () => {
  const definition: ContentTypeDefinition = {
    id: 'test',
    name: 'Test',
    icon: 'test',
    description: 'Test description',
    version: { latest: 1 },
  };
  const type = new ContentType(definition);

  expect(type.id).toBe(definition.id);
  expect(type.name).toBe(definition.name);
  expect(type.icon).toBe(definition.icon);
  expect(type.description).toBe(definition.description);
  expect(type.definition).toEqual(definition);
});
