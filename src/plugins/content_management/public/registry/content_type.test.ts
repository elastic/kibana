/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentType } from './content_type';
import { ContentTypeDetails } from './types';

test('create a content type with just an id', () => {
  const type = new ContentType({ id: 'test' });

  expect(type.id()).toBe('test');
  expect(type.name()).toBe('test');
  expect(type.icon()).toBe('questionInCircle');
  expect(type.description()).toBe('');
  expect(type.kind()).toBe('other');
});

test('create a content type with all the full details', () => {
  const details: ContentTypeDetails = {
    id: 'test',
    name: 'Test',
    icon: 'test',
    description: 'Test description',
    kind: 'user',
  };
  const type = new ContentType(details);

  expect(type.id()).toBe(details.id);
  expect(type.name()).toBe(details.name);
  expect(type.icon()).toBe(details.icon);
  expect(type.description()).toBe(details.description);
  expect(type.kind()).toBe(details.kind);
  expect(type.details).toEqual(details);
});
