/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EndpointEntriesArray } from '../common/endpoint/entries';
import { EntriesArray, Entry } from '../common/entries';
import { EntryMatch } from '../common/entry_match';
import { EntryNested } from '../common/entry_nested';
import { OsTypeArray } from '../common/os_type';

export const DATE_NOW = '2020-04-20T15:25:31.830Z';
export const OLD_DATE_RELATIVE_TO_DATE_NOW = '2020-04-19T15:25:31.830Z';
export const USER = 'some user';
export const ELASTIC_USER = 'elastic';
export const LIST_INDEX = '.lists';
export const LIST_ITEM_INDEX = '.items';
export const NAME = 'some name';
export const DESCRIPTION = 'some description';
export const LIST_ID = 'some-list-id';
export const LIST_ITEM_ID = 'some-list-item-id';
export const TIE_BREAKER = '6a76b69d-80df-4ab2-8c3e-85f466b06a0e';
export const TIE_BREAKERS = [
  '21530991-4051-46ec-bc35-2afa09a1b0b5',
  '3c662054-ae37-4aa9-9936-3e8e2ea26775',
  '60e49a20-3a23-48b6-8bf9-ed5e3b70f7a0',
  '38814080-a40f-4358-992a-3b875f9b7dec',
  '29fa61be-aaaf-411c-a78a-7059e3f723f1',
  '9c19c959-cb9d-4cd2-99e4-1ea2baf0ef0e',
  'd409308c-f94b-4b3a-8234-bbd7a80c9140',
  '87824c99-cd83-45c4-8aa6-4ad95dfea62c',
  '7b940c17-9355-479f-b882-f3e575718f79',
  '5983ad0c-4ef4-4fa0-8308-80ab9ecc4f74',
];
export const META = {};
export const TYPE = 'ip';
export const VALUE = '127.0.0.1';
export const VALUE_2 = '255.255.255';
export const NAMESPACE_TYPE = 'single';
export const NESTED_FIELD = 'parent.field';

// Exception List specific
export const ID = 'uuid_here';
export const ITEM_ID = 'some-list-item-id';
export const DETECTION_TYPE = 'detection';
export const ENDPOINT_TYPE = 'endpoint';
export const FIELD = 'host.name';
export const OPERATOR = 'included';
export const OPERATOR_EXCLUDED = 'excluded';
export const ENTRY_VALUE = 'some host name';
export const MATCH = 'match';
export const MATCH_ANY = 'match_any';
export const WILDCARD = 'wildcard';
export const MAX_IMPORT_PAYLOAD_BYTES = 9000000;
export const IMPORT_BUFFER_SIZE = 1000;
export const LIST = 'list';
export const EXISTS = 'exists';
export const NESTED = 'nested';
export const ENTRIES: EntriesArray = [
  {
    entries: [{ field: 'nested.field', operator: 'included', type: 'match', value: 'some value' }],
    field: 'some.parentField',
    type: 'nested',
  },
  { field: 'some.not.nested.field', operator: 'included', type: 'match', value: 'some value' },
];
export const ENDPOINT_ENTRIES: EndpointEntriesArray = [
  {
    entries: [{ field: 'nested.field', operator: 'included', type: 'match', value: 'some value' }],
    field: 'some.parentField',
    type: 'nested',
  },
  { field: 'some.not.nested.field', operator: 'included', type: 'match', value: 'some value' },
];
// ENTRIES_WITH_IDS should only be used to mock out functionality of a collection of transforms
// that are UI specific and useful for UI concerns that are inserted between the
// API and the actual user interface. In some ways these might be viewed as
// technical debt or to compensate for the differences and preferences
// of how ReactJS might prefer data vs. how we want to model data.
export const ENTRIES_WITH_IDS: EntriesArray = [
  {
    entries: [
      {
        field: 'nested.field',
        id: '123',
        operator: 'included',
        type: 'match',
        value: 'some value',
      } as EntryMatch & { id: string },
    ],
    field: 'some.parentField',
    id: '123',
    type: 'nested',
  } as EntryNested & { id: string },
  {
    field: 'some.not.nested.field',
    id: '123',
    operator: 'included',
    type: 'match',
    value: 'some value',
  } as Entry & { id: string },
];
export const ITEM_TYPE = 'simple';
export const OS_TYPES: OsTypeArray = ['windows'];
export const TAGS = [];
export const COMMENTS = [];
export const FILTER = 'name:Nicolas Bourbaki';
export const CURSOR = 'c29tZXN0cmluZ2ZvcnlvdQ==';
export const _VERSION = 'WzI5NywxXQ==';
export const VERSION = 1;
export const IMMUTABLE = false;
