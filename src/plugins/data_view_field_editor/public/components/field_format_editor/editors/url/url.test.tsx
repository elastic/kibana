/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { UrlFormatEditor } from './url';
import { coreMock } from '@kbn/core/public/mocks';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fieldType = 'string';
const format = {
  getConverterFor: jest
    .fn()
    .mockImplementation(() => (input: string) => `converted url for ${input}`),
  type: {
    urlTypes: [
      { kind: 'a', text: 'Link' },
      { kind: 'img', text: 'Image' },
      { kind: 'audio', text: 'Audio' },
    ],
  },
} as unknown as FieldFormat;
const formatParams = {
  openLinkInCurrentTab: true,
  urlTemplate: '',
  labelTemplate: '',
  width: '',
  height: '',
  type: 'a',
};

const onChange = jest.fn();
const onError = jest.fn();

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <IntlProvider locale={'en'}>
      <KibanaReactContext.Provider>{Element}</KibanaReactContext.Provider>
    </IntlProvider>
  );

const MY_BASE_PATH = 'my-base-path';
const KibanaReactContext = createKibanaReactContext(
  coreMock.createStart({ basePath: 'my-base-path' })
);

describe('UrlFormatEditor', () => {
  it('should have a formatId', () => {
    expect(UrlFormatEditor.formatId).toEqual('url');
  });

  it('should render normally', async () => {
    const { container } = renderWithContext(
      <UrlFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should render width and height fields if image', async () => {
    const { getByLabelText } = renderWithContext(
      <UrlFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={{ ...formatParams, type: 'img' }}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(getByLabelText('Width')).toBeInTheDocument();
    expect(getByLabelText('Height')).toBeInTheDocument();
  });

  it('should append base path to preview images', async () => {
    let sampleImageUrlTemplate = '';
    const { getByLabelText } = renderWithContext(
      <UrlFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={{ ...formatParams, urlTemplate: '' }}
        onChange={({ urlTemplate }) => {
          sampleImageUrlTemplate = urlTemplate;
        }}
        onError={onError}
      />
    );

    // TODO: sample image url emitted only during change event
    // So can't just path `type: img` and check rendered value
    userEvent.selectOptions(getByLabelText('Type'), 'img');
    expect(sampleImageUrlTemplate).toContain(MY_BASE_PATH);
    expect(sampleImageUrlTemplate).toMatchInlineSnapshot(
      `"my-base-path/plugins/indexPatternManagement/assets/icons/{{value}}.png"`
    );
  });
});
