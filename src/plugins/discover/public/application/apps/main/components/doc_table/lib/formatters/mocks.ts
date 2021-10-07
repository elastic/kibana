/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern } from '../../../../../../../../../data/common';
import { stubbedSavedObjectIndexPattern } from '../../../../../../../../../data/common/stubs';
import { fieldFormatsMock } from '../../../../../../../../../field_formats/common/mocks';
import { DocTableRow } from '../../components/table_row';

export const hit = {
  _id: 'a',
  _type: 'doc',
  _score: 1,
  _source: {
    foo: 'bar',
    number: 42,
    hello: '<h1>World</h1>',
    also: 'with "quotes" or \'single quotes\'',
  },
} as DocTableRow;

const createIndexPattern = () => {
  const id = 'my-index';
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new IndexPattern({
    spec: { id, type, version, timeFieldName, fields: JSON.parse(fields), title },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
  });
};

export const indexPattern = createIndexPattern();
