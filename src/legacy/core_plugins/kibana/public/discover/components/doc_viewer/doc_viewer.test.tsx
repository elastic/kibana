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
import { mount, shallow } from 'enzyme';
import { DocViewer } from './doc_viewer';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { DocViewRenderProps } from '../../doc_views/doc_views_registry';
import { getServices } from '../../kibana_services';

jest.mock('../../kibana_services', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DocViewsRegistry } = require('../../doc_views/doc_views_registry');
  let registry = new DocViewsRegistry();
  return {
    getServices: () => ({
      docViewsRegistry: registry,
      resetRegistry: () => {
        registry = new DocViewsRegistry();
      },
    }),
  };
});

beforeEach(() => {
  (getServices() as any).resetRegistry();
  jest.clearAllMocks();
});

test('Render <DocViewer/> with 3 different tabs', () => {
  const registry = getServices().docViewsRegistry;
  registry.addDocView({ order: 20, title: 'React component', component: () => <div>test</div> });
  registry.addDocView({ order: 10, title: 'Render function', render: jest.fn() });
  registry.addDocView({ order: 30, title: 'Invalid doc view' });

  const renderProps = { hit: {} } as DocViewRenderProps;

  const wrapper = shallow(<DocViewer {...renderProps} />);

  expect(wrapper).toMatchSnapshot();
});

test('Render <DocViewer/> with 1 tab displaying error message', () => {
  function SomeComponent() {
    // this is just a placeholder
    return null;
  }

  const registry = getServices().docViewsRegistry;
  registry.addDocView({
    order: 10,
    title: 'React component',
    component: SomeComponent,
  });

  const renderProps = { hit: {} } as DocViewRenderProps;
  const errorMsg = 'Catch me if you can!';

  const wrapper = mount(<DocViewer {...renderProps} />);
  const error = new Error(errorMsg);
  wrapper.find(SomeComponent).simulateError(error);
  const errorMsgComponent = findTestSubject(wrapper, 'docViewerError');
  expect(errorMsgComponent.text()).toMatch(new RegExp(`${errorMsg}`));
});
