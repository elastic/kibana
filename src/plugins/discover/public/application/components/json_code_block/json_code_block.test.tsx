/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { JsonCodeBlock } from './json_code_block';
import { IndexPattern } from '../../../../../data/public';

it('returns the `JsonCodeEditor` component', () => {
  const props = {
    hit: { _index: 'test', _type: 'doc', _id: 'foo', _score: 1, _source: { test: 123 } },
    columns: [],
    indexPattern: {} as IndexPattern,
    filter: jest.fn(),
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
  };
  expect(shallow(<JsonCodeBlock {...props} />)).toMatchSnapshot();
});
