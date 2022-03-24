/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { coreMock } from 'src/core/public/mocks';
import { createKibanaReactContext } from '../../../../../../kibana_react/public';
import { FieldFormat } from 'src/plugins/field_formats/common';

import { PercentFormatEditor } from './percent';

type PercentFormatEditorProps = React.ComponentProps<typeof PercentFormatEditor>;

const fieldType = 'number';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => (input: number) => input * 2),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { pattern: '0,0.[000]%' };
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

describe('PercentFormatEditor', () => {
  beforeAll(() => {
    // Enzyme does not support the new Context API in shallow rendering.
    // @see https://github.com/enzymejs/enzyme/issues/2189
    (PercentFormatEditor as React.ComponentType<PercentFormatEditorProps>).contextTypes = {
      services: () => null,
    };
    delete (PercentFormatEditor as Partial<typeof PercentFormatEditor>).contextType;
  });

  it('should have a formatId', () => {
    expect(PercentFormatEditor.formatId).toEqual('percent');
  });

  it('should render normally', async () => {
    const component = shallow(
      <PercentFormatEditor
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
