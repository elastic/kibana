/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DiscoverGridFlyout, DiscoverGridFlyoutProps } from './discover_grid_flyout';
import { esHits } from '../../__mocks__/es_hits';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { dataViewMock } from '../../__mocks__/data_view';
import { DiscoverServices } from '../../build_services';
import { DocViewsRegistry } from '../../services/doc_views/doc_views_registry';
import { setDocViewsRegistry } from '../../kibana_services';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '../../types';
import { buildDataTableRecord } from '../../utils/build_data_record';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';

const waitNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

const waitNextUpdate = async (component: ReactWrapper) => {
  await act(async () => {
    await waitNextTick();
  });
  component.update();
};

describe('Discover flyout', function () {
  setDocViewsRegistry(new DocViewsRegistry());

  const mountComponent = async ({
    dataView,
    hits,
    hitIndex,
  }: {
    dataView?: DataView;
    hits?: DataTableRecord[];
    hitIndex?: number;
  }) => {
    const onClose = jest.fn();
    const services = {
      filterManager: createFilterManagerMock(),
      addBasePath: (path: string) => `/base${path}`,
      history: () => ({ location: {} }),
      locator: {
        useUrl: jest.fn(() => ''),
        navigate: jest.fn(),
        getUrl: jest.fn(() => Promise.resolve('mock-referrer')),
      },
      contextLocator: { getRedirectUrl: jest.fn(() => 'mock-context-redirect-url') },
      singleDocLocator: { getRedirectUrl: jest.fn(() => 'mock-doc-redirect-url') },
    } as unknown as DiscoverServices;

    const hit = buildDataTableRecord(
      hitIndex ? esHits[hitIndex] : (esHits[0] as EsHitRecord),
      dataViewMock
    );

    const props = {
      columns: ['date'],
      dataView: dataView || dataViewMock,
      hit,
      hits:
        hits ||
        esHits.map((entry: EsHitRecord) => buildDataTableRecord(entry, dataView || dataViewMock)),
      onAddColumn: jest.fn(),
      onClose,
      onFilter: jest.fn(),
      onRemoveColumn: jest.fn(),
      setExpandedDoc: jest.fn(),
    };

    const Proxy = (newProps: DiscoverGridFlyoutProps) => (
      <KibanaContextProvider services={services}>
        <DiscoverGridFlyout {...newProps} />
      </KibanaContextProvider>
    );

    const component = mountWithIntl(<Proxy {...props} />);
    await waitNextUpdate(component);

    return { component, props };
  };

  it('should be rendered correctly using an data view without timefield', async () => {
    const { component, props } = await mountComponent({});

    const url = findTestSubject(component, 'docTableRowAction').prop('href');
    expect(url).toMatchInlineSnapshot(`"mock-doc-redirect-url"`);
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('should be rendered correctly using an data view with timefield', async () => {
    const { component, props } = await mountComponent({ dataView: dataViewWithTimefieldMock });

    const actions = findTestSubject(component, 'docTableRowAction');
    expect(actions.length).toBe(2);
    expect(actions.first().prop('href')).toMatchInlineSnapshot(`"mock-doc-redirect-url"`);
    expect(actions.last().prop('href')).toMatchInlineSnapshot(`"mock-context-redirect-url"`);
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('displays document navigation when there is more than 1 doc available', async () => {
    const { component } = await mountComponent({ dataView: dataViewWithTimefieldMock });
    const docNav = findTestSubject(component, 'dscDocNavigation');
    expect(docNav.length).toBeTruthy();
  });

  it('displays no document navigation when there are 0 docs available', async () => {
    const { component } = await mountComponent({ hits: [] });
    const docNav = findTestSubject(component, 'dscDocNavigation');
    expect(docNav.length).toBeFalsy();
  });

  it('displays no document navigation when the expanded doc is not part of the given docs', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const hits = [
      {
        _index: 'new',
        _id: '1',
        _score: 1,
        _type: '_doc',
        _source: { date: '2020-20-01T12:12:12.123', message: 'test1', bytes: 20 },
      },
      {
        _index: 'new',
        _id: '2',
        _score: 1,
        _type: '_doc',
        _source: { date: '2020-20-01T12:12:12.124', name: 'test2', extension: 'jpg' },
      },
    ].map((hit) => buildDataTableRecord(hit, dataViewMock));
    const { component } = await mountComponent({ hits });
    const docNav = findTestSubject(component, 'dscDocNavigation');
    expect(docNav.length).toBeFalsy();
  });

  it('allows you to navigate to the next doc, if expanded doc is the first', async () => {
    // scenario: you've expanded a doc, and in the next request different docs where fetched
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'pagination-button-next').simulate('click');
    // we selected 1, so we'd expect 2
    expect(props.setExpandedDoc.mock.calls[0][0].raw._id).toBe('2');
  });

  it('doesnt allow you to navigate to the previous doc, if expanded doc is the first', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'pagination-button-previous').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('doesnt allow you to navigate to the next doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({ hitIndex: esHits.length - 1 });
    findTestSubject(component, 'pagination-button-next').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('allows you to navigate to the previous doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({ hitIndex: esHits.length - 1 });
    findTestSubject(component, 'pagination-button-previous').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(1);
    expect(props.setExpandedDoc.mock.calls[0][0].raw._id).toBe('4');
  });

  it('allows navigating with arrow keys through documents', async () => {
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::2::' }));
    component.setProps({ ...props, hit: props.hits[1] });
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::1::' }));
  });

  it('should not navigate with keypresses when already at the border of documents', async () => {
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
    component.setProps({ ...props, hit: props.hits[props.hits.length - 1] });
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });
});
