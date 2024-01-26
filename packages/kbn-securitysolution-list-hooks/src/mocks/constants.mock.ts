/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  CommentsArray,
  EntriesArray,
  Entry,
  EntryMatch,
  EntryNested,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';

export const DATE_NOW = '2020-04-20T15:25:31.830Z';
export const USER = 'some user';
export const ELASTIC_USER = 'elastic';
export const NAME = 'some name';
export const DESCRIPTION = 'some description';
export const LIST_ID = 'some-list-id';
export const TIE_BREAKER = '6a76b69d-80df-4ab2-8c3e-85f466b06a0e';

export const META = {};
export const TYPE = 'ip';

export const VERSION = 1;
export const IMMUTABLE = false;
// Exception List specific
export const ID = 'uuid_here';
export const NAMESPACE_TYPE = 'single';
export const OS_TYPES: OsTypeArray = ['windows'];
export const TAGS = [];
export const UPDATED_COMMENTS = [
  {
    comment: 'old comment',
    id: 'old_created_id',
  },
  {
    comment: 'new comment',
    id: 'new_id',
  },
];
export const COMMENTS = [];
export const ENTRIES: EntriesArray = [
  {
    entries: [{ field: 'nested.field', operator: 'included', type: 'match', value: 'some value' }],
    field: 'some.parentField',
    type: 'nested',
  },
  { field: 'some.not.nested.field', operator: 'included', type: 'match', value: 'some value' },
];
export const ITEM_ID = 'some-list-item-id';
export const ITEM_TYPE = 'simple';
export const LIST_ITEM_ID = 'some-list-item-id';
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

export const COMMENTS_WITH_CREATEDAT_CREATEDBY: CommentsArray = [
  {
    comment: 'old comment',
    id: 'old_created_id',
    created_at: '2022-01-08T15:25:31.830Z',
    created_by: 'elastic',
  },
  {
    comment: 'new comment',
    id: 'new_id',
    created_at: '2022-05-14T15:25:31.830Z',
    created_by: 'elastic',
  },
];
