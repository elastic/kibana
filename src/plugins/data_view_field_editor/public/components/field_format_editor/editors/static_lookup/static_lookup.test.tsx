/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';
import { StaticLookupFormatEditorFormatParams } from './static_lookup';
import { FieldFormat } from 'src/plugins/field_formats/common';

import { StaticLookupFormatEditor } from './static_lookup';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn(),
};
const formatParams = {
  lookupEntries: [{}] as StaticLookupFormatEditorFormatParams['lookupEntries'],
  unknownKeyValue: '',
};
const onChange = jest.fn();
const onError = jest.fn();

describe('StaticLookupFormatEditor', () => {
  it('should have a formatId', () => {
    expect(StaticLookupFormatEditor.formatId).toEqual('static_lookup');
  });

  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <StaticLookupFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render multiple lookup entries and unknown key value', async () => {
    const component = shallowWithI18nProvider(
      <StaticLookupFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={{
          lookupEntries: [{}, {}, {}] as StaticLookupFormatEditorFormatParams['lookupEntries'],
          unknownKeyValue: 'test value',
        }}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
