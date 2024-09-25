/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const getListItemResponseMock = (): ListItemSchema => ({
  _version: '1',
  '@timestamp': '2020-08-11T11:22:13.670Z',
  created_at: '2020-08-11T11:22:13.670Z',
  created_by: 'elastic',
  deserializer: 'some deserializer',
  id: 'bpdB3XMBx7pemMHopQ6M',
  list_id: 'list_id',
  meta: {},
  serializer: 'some serializer',
  tie_breaker_id: '17d3befb-dc22-4b3c-a286-b5504c4fbeeb',
  type: 'keyword',
  updated_at: '2020-08-11T11:22:13.670Z',
  updated_by: 'elastic',
  value: 'some keyword',
});
