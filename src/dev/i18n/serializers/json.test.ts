/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { serializeToJson } from './json';

describe('dev/i18n/serializers/json', () => {
  test('should serialize default messages to JSON', () => {
    const messages: Array<[string, { message: string; description?: string }]> = [
      ['plugin1.message.id-1', { message: 'Message text 1 ' }],
      [
        'plugin2.message.id-2',
        {
          message: 'Message text 2',
          description: 'Message description',
        },
      ],
    ];

    expect(serializeToJson(messages)).toMatchSnapshot();
  });
});
