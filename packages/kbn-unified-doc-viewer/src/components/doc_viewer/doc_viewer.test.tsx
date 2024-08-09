/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { render, screen } from '@testing-library/react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DocViewer, INITIAL_TAB } from './doc_viewer';
import type { DocViewRenderProps } from '../../types';
import { DocViewsRegistry } from '../..';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';

const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));

const mockSetLocalStorage = jest.fn();
const mockLocalStorageKey = INITIAL_TAB;
let mockTestInitialLocalStorageValue: string | undefined;

jest.mock('react-use/lib/useLocalStorage', () => {
  return jest.fn((key: string, initialValue: number) => {
    if (key !== mockLocalStorageKey) {
      throw new Error(`Unexpected key: ${key}`);
    }
    return [mockTestInitialLocalStorageValue ?? initialValue, mockSetLocalStorage];
  });
});

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

  test('should save active tab to local storage', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'test1', order: 10, title: 'Render function', render: jest.fn() });
    registry.add({ id: 'test2', order: 20, title: 'Render function', render: jest.fn() });

    render(<DocViewer docViews={registry.getAll()} hit={records[0]} dataView={dataViewMock} />);

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('false');

    screen.getByTestId('docViewerTab-test2').click();

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('true');
    expect(mockSetLocalStorage).toHaveBeenCalledWith('kbn_doc_viewer_tab_test2');

    screen.getByTestId('docViewerTab-test1').click();

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('false');
    expect(mockSetLocalStorage).toHaveBeenCalledWith('kbn_doc_viewer_tab_test1');
  });

  test('should restore active tab from local storage', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'test1', order: 10, title: 'Render function', render: jest.fn() });
    registry.add({ id: 'test2', order: 20, title: 'Render function', render: jest.fn() });

    mockTestInitialLocalStorageValue = 'kbn_doc_viewer_tab_test2';

    render(<DocViewer docViews={registry.getAll()} hit={records[0]} dataView={dataViewMock} />);

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('true');

    mockTestInitialLocalStorageValue = undefined;
  });

  test('should not restore a tab from local storage if unavailable', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'test1', order: 10, title: 'Render function', render: jest.fn() });
    registry.add({ id: 'test2', order: 20, title: 'Render function', render: jest.fn() });

    mockTestInitialLocalStorageValue = 'kbn_doc_viewer_tab_test3';

    render(<DocViewer docViews={registry.getAll()} hit={records[0]} dataView={dataViewMock} />);

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('false');

    mockTestInitialLocalStorageValue = undefined;
  });
});
