/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { serializeToJson } from './json';

describe('i18n json serializer', () => {
  test('should serialize default messages to JSON', () => {
    expect(
      serializeToJson([
        {
          id: 'plugin1.message.id-1',
          defaultMessage: 'Message text 1 ',
        },
        {
          id: 'plugin2.message.id-2',
          defaultMessage: 'Message text 2',
          description: 'Message description',
        },
      ])
    ).toMatchSnapshot();
  });
});
