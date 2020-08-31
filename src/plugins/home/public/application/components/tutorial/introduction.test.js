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
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { Introduction } from './introduction';

jest.mock('../../../../../kibana_react/public', () => {
  return {
    Markdown: () => <div className="markdown" />,
  };
});

test('render', () => {
  const component = shallowWithIntl(
    <Introduction.WrappedComponent
      description="this is a great tutorial about..."
      title="Great tutorial"
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('props', () => {
  test('iconType', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        iconType="logoElastic"
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('exportedFieldsUrl', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        exportedFieldsUrl="exported_fields_url"
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('previewUrl', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        previewUrl="preview_image_url"
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('isBeta', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        isBeta={true}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
