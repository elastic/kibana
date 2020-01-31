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

jest.mock('../lib/url_shortener', () => ({}));

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { UrlPanelContent } from './url_panel_content';

test('render', () => {
  const component = shallowWithIntl(
    <UrlPanelContent.WrappedComponent
      allowShortUrl={true}
      objectType="dashboard"
      getUnhashableStates={() => {}}
    />
  );
  expect(component).toMatchSnapshot();
});

test('should enable saved object export option when objectId is provided', () => {
  const component = shallowWithIntl(
    <UrlPanelContent.WrappedComponent
      allowShortUrl={true}
      objectId="id1"
      objectType="dashboard"
      getUnhashableStates={() => {}}
    />
  );
  expect(component).toMatchSnapshot();
});

test('should hide short url section when allowShortUrl is false', () => {
  const component = shallowWithIntl(
    <UrlPanelContent.WrappedComponent
      allowShortUrl={false}
      objectId="id1"
      objectType="dashboard"
      getUnhashableStates={() => {}}
    />
  );
  expect(component).toMatchSnapshot();
});
