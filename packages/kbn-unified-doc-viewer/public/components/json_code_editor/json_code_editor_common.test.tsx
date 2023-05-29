/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { JsonCodeEditorCommon } from './json_code_editor_common';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

it('returns the `JsonCodeEditorCommon` component', () => {
  const value = JSON.stringify({
    _index: 'test',
    _type: 'doc',
    _id: 'foo',
    _score: 1,
    _source: { test: 123 },
  });
  expect(
    shallow(
      <JsonCodeEditorCommon
        CodeEditor={CodeEditor}
        jsonValue={value}
        height={300}
        width={500}
        onEditorDidMount={() => {}}
      />
    )
  ).toMatchSnapshot();
});
