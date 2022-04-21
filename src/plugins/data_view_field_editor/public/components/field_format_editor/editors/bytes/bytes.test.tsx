/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { coreMock } from '@kbn/core/public/mocks';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

import { BytesFormatEditor } from './bytes';

type BytesFormatEditorProps = React.ComponentProps<typeof BytesFormatEditor>;

const fieldType = 'number';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => (input: number) => input * 2),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { pattern: '0,0.[000]b' };
  }),
};
const formatParams = {
  pattern: '',
};
const onChange = jest.fn();
const onError = jest.fn();

const KibanaReactContext = createKibanaReactContext(
  coreMock.createStart({ basePath: 'my-base-path' })
);

describe('BytesFormatEditor', () => {
  beforeAll(() => {
    // Enzyme does not support the new Context API in shallow rendering.
    // @see https://github.com/enzymejs/enzyme/issues/2189
    (BytesFormatEditor as React.ComponentType<BytesFormatEditorProps>).contextTypes = {
      services: () => null,
    };
    delete (BytesFormatEditor as Partial<typeof BytesFormatEditor>).contextType;
  });

  it('should have a formatId', () => {
    expect(BytesFormatEditor.formatId).toEqual('bytes');
  });

  it('should render normally', async () => {
    const component = shallow(
      <BytesFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />,
      { context: KibanaReactContext.value }
    );
    expect(component).toMatchSnapshot();
  });
});
