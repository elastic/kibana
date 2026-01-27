/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';
import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { DiscoverGridFlyoutProps } from './discover_grid_flyout';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverServices } from '../../build_services';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord, buildDataTableRecordList } from '@kbn/discover-utils';
import { act } from 'react-dom/test-utils';
import type { ReactWrapper } from 'enzyme';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import { discoverServiceMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { UnifiedDocViewerFlyoutProps } from '@kbn/unified-doc-viewer-plugin/public';

let mockFlyoutCustomBody: ComponentType | undefined;

jest.mock('@kbn/unified-doc-viewer-plugin/public', () => {
  const actual = jest.requireActual('@kbn/unified-doc-viewer-plugin/public');
  const OriginalFlyout = actual.UnifiedDocViewerFlyout;
  return {
    ...actual,
    UnifiedDocViewerFlyout: (props: UnifiedDocViewerFlyoutProps) => (
      <OriginalFlyout
        {...props}
        {...(mockFlyoutCustomBody ? { FlyoutCustomBody: mockFlyoutCustomBody } : {})}
      />
    ),
  };
});

const waitNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

const waitNextUpdate = async (component: ReactWrapper) => {
  await act(async () => {
    await waitNextTick();
  });
  component.update();
};

describe('Discover flyout', function () {
  const getServices = () => {
    return {
      ...discoverServiceMock,
      contextLocator: { getRedirectUrl: jest.fn(() => 'mock-context-redirect-url') },
      singleDocLocator: { getRedirectUrl: jest.fn(() => 'mock-doc-redirect-url') },
      toastNotifications: {
        addSuccess: jest.fn(),
      },
    } as unknown as DiscoverServices;
  };

  const mountComponent = async ({
    dataView,
    records,
    expandedHit,
    query,
    services = getServices(),
  }: {
    dataView?: DataView;
    records?: DataTableRecord[];
    expandedHit?: EsHitRecord;
    query?: Query | AggregateQuery;
    services?: DiscoverServices;
  }) => {
    const onClose = jest.fn();
    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

    const currentRecords =
      records ||
      esHitsMock.map((entry: EsHitRecord) => buildDataTableRecord(entry, dataView || dataViewMock));

    const props = {
      columns: ['date'],
      dataView: dataView || dataViewMock,
      hit: expandedHit
        ? buildDataTableRecord(expandedHit, dataView || dataViewMock)
        : currentRecords[0],
      hits: currentRecords,
      query,
      onAddColumn: jest.fn(),
      onClose,
      onFilter: jest.fn(),
      onRemoveColumn: jest.fn(),
      setExpandedDoc: jest.fn(),
    };

    const Proxy = (newProps: DiscoverGridFlyoutProps) => (
      <DiscoverTestProvider services={services}>
        <DiscoverGridFlyout {...newProps} />
      </DiscoverTestProvider>
    );

    const component = mountWithIntl(<Proxy {...props} />);
    await waitNextUpdate(component);

    return { component, props, services };
  };

  beforeEach(() => {
    mockFlyoutCustomBody = undefined;
    jest.clearAllMocks();
  });

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
    const docNav = findTestSubject(component, 'docViewerFlyoutNavigation');
    expect(docNav.length).toBeTruthy();
  });

  it('displays no document navigation when there are 0 docs available', async () => {
    const { component } = await mountComponent({ records: [], expandedHit: esHitsMock[0] });
    const docNav = findTestSubject(component, 'docViewerFlyoutNavigation');
    expect(docNav.length).toBeFalsy();
  });

  it('displays no document navigation when the expanded doc is not part of the given docs', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const records = [
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
    const { component } = await mountComponent({ records, expandedHit: esHitsMock[0] });
    const docNav = findTestSubject(component, 'docViewerFlyoutNavigation');
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
    const { component, props } = await mountComponent({
      expandedHit: esHitsMock[esHitsMock.length - 1],
    });
    findTestSubject(component, 'pagination-button-next').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('allows you to navigate to the previous doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({
      expandedHit: esHitsMock[esHitsMock.length - 1],
    });
    findTestSubject(component, 'pagination-button-previous').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(1);
    expect(props.setExpandedDoc.mock.calls[0][0].raw._id).toBe('4');
  });

  it('allows navigating with arrow keys through documents', async () => {
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::2::' }));
    component.setProps({ ...props, hit: props.hits[1] });
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::1::' }));
  });

  it('should not navigate with keypresses when already at the border of documents', async () => {
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
    component.setProps({ ...props, hit: props.hits[props.hits.length - 1] });
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('should not navigate with arrow keys through documents if an input is in focus', async () => {
    mockFlyoutCustomBody = () => <input data-test-subj="flyoutCustomInput" />;
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'flyoutCustomInput').simulate('keydown', {
      key: 'ArrowRight',
    });
    findTestSubject(component, 'flyoutCustomInput').simulate('keydown', {
      key: 'ArrowLeft',
    });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('should not render single/surrounding views for ES|QL', async () => {
    const { component } = await mountComponent({
      query: { esql: 'FROM indexpattern' },
    });
    const singleDocumentView = findTestSubject(component, 'docTableRowAction');
    expect(singleDocumentView.length).toBeFalsy();

    // After opting in to flyout session management we render title via flyoutMenuProps prop, not as an explicit element anymore
    // Enzyme has limitations with reading the header, so we check the prop directly
    // TODO: check title text content directly after migrating the test to RTL https://github.com/elastic/kibana/issues/222939
    const flyout = component.find('EuiFlyout');
    const flyoutMenuProps = flyout.prop('flyoutMenuProps');
    expect(flyoutMenuProps).toEqual(
      expect.objectContaining({
        title: 'Result',
        hideTitle: false,
      })
    );
  });

  describe('context awareness', () => {
    it('should render flyout per the defined document profile', async () => {
      const services = getServices();
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
      ];
      const scopedProfilesManager = services.profilesManager.createScopedProfilesManager({
        scopedEbtManager: services.ebtManager.createScopedEBTManager(),
      });
      const records = buildDataTableRecordList({
        records: hits as EsHitRecord[],
        dataView: dataViewMock,
        processRecord: (record) => scopedProfilesManager.resolveDocumentProfile({ record }),
      });
      const { component } = await mountComponent({ records, services });

      const content = findTestSubject(component, 'kbnDocViewer');
      expect(content.text()).toBe('Mock tab');

      // TODO: check title text content directly after migrating the test to RTL https://github.com/elastic/kibana/issues/222939
      const flyout = component.find('EuiFlyout');
      const flyoutMenuProps = flyout.prop('flyoutMenuProps');
      expect(flyoutMenuProps).toEqual(
        expect.objectContaining({
          title: 'Document #new::1::',
          hideTitle: false,
        })
      );
    });
  });
});
