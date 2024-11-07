/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  FoundListSchema,
  ListSchema,
  FoundListsBySizeSchema,
} from '@kbn/securitysolution-io-ts-list-types';

// TODO: Once this mock is available within packages, use it instead, https://github.com/elastic/kibana/issues/100715
// import { getFoundListSchemaMock } from '../../../../../lists/common/schemas/response/found_list_schema.mock';
export const getFoundListSchemaMock = (): FoundListSchema => ({
  cursor: '123',
  data: [getListResponseMock()],
  page: 1,
  per_page: 1,
  total: 1,
});

export const getFoundListsBySizeSchemaMock = (): FoundListsBySizeSchema => ({
  smallLists: [getListResponseMock()],
  largeLists: [getListResponseMock()],
});

// TODO: Once these mocks are available from packages use it instead, https://github.com/elastic/kibana/issues/100715
export const DATE_NOW = '2020-04-20T15:25:31.830Z';
export const USER = 'some user';
export const IMMUTABLE = false;
export const VERSION = 1;
export const DESCRIPTION = 'some description';
export const TIE_BREAKER = '6a76b69d-80df-4ab2-8c3e-85f466b06a0e';
export const LIST_ID = 'some-list-id';
export const META = {};
export const TYPE = 'ip';
export const NAME = 'some name';

// TODO: Once this mock is available within packages, use it instead, https://github.com/elastic/kibana/issues/100715
// import { getListResponseMock } from '../../../../../lists/common/schemas/response/list_schema.mock';
export const getListResponseMock = (): ListSchema => ({
  '@timestamp': DATE_NOW,
  _version: undefined,
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  deserializer: undefined,
  id: LIST_ID,
  immutable: IMMUTABLE,
  meta: META,
  name: NAME,
  serializer: undefined,
  tie_breaker_id: TIE_BREAKER,
  type: TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
  version: VERSION,
});
