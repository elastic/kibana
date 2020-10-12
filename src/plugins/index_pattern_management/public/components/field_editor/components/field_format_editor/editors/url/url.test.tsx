/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { FieldFormat } from 'src/plugins/data/public';
import { IntlProvider } from 'react-intl';
import { UrlFormatEditor } from './url';
import { coreMock } from '../../../../../../../../../core/public/mocks';
import { createKibanaReactContext } from '../../../../../../../../kibana_react/public';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@elastic/eui/lib/services/accessibility', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

const fieldType = 'string';
const format = ({
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
} as unknown) as FieldFormat;
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

  it('should render url template help', async () => {
    const { getByText, getByTestId } = renderWithContext(
      <UrlFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    getByText('URL template help');
    userEvent.click(getByText('URL template help'));
    expect(getByTestId('urlTemplateFlyoutTestSubj')).toBeVisible();
  });

  it('should render label template help', async () => {
    const { getByText, getByTestId } = renderWithContext(
      <UrlFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    getByText('Label template help');
    userEvent.click(getByText('Label template help'));
    expect(getByTestId('labelTemplateFlyoutTestSubj')).toBeVisible();
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
