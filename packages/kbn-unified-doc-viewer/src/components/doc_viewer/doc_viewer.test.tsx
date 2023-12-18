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
import type { DocViewRenderProps } from '../../types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DocViewsRegistry } from '../..';

describe('<DocViewer />', () => {
  test('Render <DocViewer/> with 3 different tabs', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'function', order: 10, title: 'Render function', render: jest.fn() });
    registry.add({
      id: 'component',
      order: 20,
      title: 'React component',
      component: () => <div>test</div>,
    });
    // @ts-expect-error This should be invalid and will throw an error when rendering
    registry.add({ id: 'invalid', order: 30, title: 'Invalid doc view' });

    const renderProps = { hit: {} } as DocViewRenderProps;

    const wrapper = shallow(<DocViewer docViews={registry.getAll()} {...renderProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('Render <DocViewer/> with 1 tab displaying error message', () => {
    function SomeComponent() {
      // this is just a placeholder
      return null;
    }

    const registry = new DocViewsRegistry();
    registry.add({
      id: 'component',
      order: 10,
      title: 'React component',
      component: SomeComponent,
    });

    const renderProps = {
      hit: buildDataTableRecord({ _index: 't', _id: '1' }),
    } as DocViewRenderProps;
    const errorMsg = 'Catch me if you can!';

    const wrapper = mount(<DocViewer docViews={registry.getAll()} {...renderProps} />);
    const error = new Error(errorMsg);
    wrapper.find(SomeComponent).simulateError(error);
    const errorMsgComponent = findTestSubject(wrapper, 'docViewerError');
    expect(errorMsgComponent.text()).toMatch(new RegExp(`${errorMsg}`));
  });
});
