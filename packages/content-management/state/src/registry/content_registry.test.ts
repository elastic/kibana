/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentRegistry } from './content_registry';

test('can register and retrieve a type', () => {
  const registry = new ContentRegistry();

  registry.register({
    id: 'test',
    name: 'Test',
    icon: 'test',
    description: 'A test type',
    operations: {},
  });
  const type = registry.get('test')!;

  expect(type.details.name).toBe('Test');
});
