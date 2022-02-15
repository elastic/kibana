/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { DocViewer } from './doc_viewer';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getDocViewsRegistry } from '../../../../kibana_services';
import { DocViewRenderProps } from '../../doc_views_types';

jest.mock('../../../../kibana_services', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let registry: any[] = [];
  return {
    getDocViewsRegistry: () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addDocView(view: any) {
        registry.push(view);
      },
      getDocViewsSorted() {
        return registry;
      },
      resetRegistry: () => {
        registry = [];
      },
    }),
  };
});

jest.mock('../../../../utils/use_discover_services', () => {
  return {
    useDiscoverServices: {
      uiSettings: {
        get: jest.fn(),
      },
    },
  };
});

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (getDocViewsRegistry() as any).resetRegistry();
  jest.clearAllMocks();
});

test('Render <DocViewer/> with 3 different tabs', () => {
  const registry = getDocViewsRegistry();
  registry.addDocView({ order: 10, title: 'Render function', render: jest.fn() });
  registry.addDocView({ order: 20, title: 'React component', component: () => <div>test</div> });
  // @ts-expect-error This should be invalid and will throw an error when rendering
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

  const registry = getDocViewsRegistry();
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
