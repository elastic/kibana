/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { JsonCodeEditor } from './json_code_editor';

it('returns the `JsonCodeEditor` component', () => {
  const value = {
    _index: 'test',
    _type: 'doc',
    _id: 'foo',
    _score: 1,
    _source: { test: 123 },
  };
  expect(shallow(<JsonCodeEditor json={value} />)).toMatchSnapshot();
});
