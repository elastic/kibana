/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { DiscoverGridFlyout, DiscoverGridFlyoutProps } from './discover_grid_flyout';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverServices } from '../../build_services';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import { FlyoutCustomization, useDiscoverCustomization } from '../../customizations';

const mockFlyoutCustomization: FlyoutCustomization = {
  id: 'flyout',
  actions: {},
};

jest.mock('../../customizations', () => ({
  ...jest.requireActual('../../customizations'),
  useDiscoverCustomization: jest.fn(),
}));

let mockBreakpointSize: string | null = null;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: jest.fn((breakpoints: string[]) => {
      if (mockBreakpointSize && breakpoints.includes(mockBreakpointSize)) {
        return true;
      }

      return original.useIsWithinBreakpoints(breakpoints);
    }),
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
  const mountComponent = async ({
    dataView,
    hits,
    hitIndex,
    query,
  }: {
    dataView?: DataView;
    hits?: DataTableRecord[];
    hitIndex?: number;
    query?: Query | AggregateQuery;
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
      toastNotifications: {
        addSuccess: jest.fn(),
      },
    } as unknown as DiscoverServices;
    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

    const hit = buildDataTableRecord(
      hitIndex ? esHitsMock[hitIndex] : (esHitsMock[0] as EsHitRecord),
      dataViewMock
    );

    const props = {
      columns: ['date'],
      dataView: dataView || dataViewMock,
      hit,
      hits:
        hits ||
        esHitsMock.map((entry: EsHitRecord) =>
          buildDataTableRecord(entry, dataView || dataViewMock)
        ),
      query,
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

    return { component, props, services };
  };

  beforeEach(() => {
    mockFlyoutCustomization.actions.defaultActions = undefined;
    mockFlyoutCustomization.Content = undefined;
    jest.clearAllMocks();

    (useDiscoverCustomization as jest.Mock).mockImplementation(() => mockFlyoutCustomization);
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
    const { component, props } = await mountComponent({ hitIndex: esHitsMock.length - 1 });
    findTestSubject(component, 'pagination-button-next').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('allows you to navigate to the previous doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({ hitIndex: esHitsMock.length - 1 });
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

  it('should not render single/surrounding views for text based', async () => {
    const { component } = await mountComponent({
      query: { esql: 'FROM indexpattern' },
    });
    const singleDocumentView = findTestSubject(component, 'docTableRowAction');
    expect(singleDocumentView.length).toBeFalsy();
    const flyoutTitle = findTestSubject(component, 'docTableRowDetailsTitle');
    expect(flyoutTitle.text()).toBe('Row');
  });

  describe('with applied customizations', () => {
    describe('when title is customized', () => {
      it('should display the passed string as title', async () => {
        const customTitle = 'Custom flyout title';
        mockFlyoutCustomization.title = customTitle;

        const { component } = await mountComponent({});

        const titleNode = findTestSubject(component, 'docTableRowDetailsTitle');

        expect(titleNode.text()).toBe(customTitle);
      });
    });

    describe('when actions are customized', () => {
      it('should display actions added by getActionItems', async () => {
        mockBreakpointSize = 'xl';
        mockFlyoutCustomization.actions = {
          getActionItems: jest.fn(() => [
            {
              id: 'action-item-1',
              enabled: true,
              label: 'Action 1',
              iconType: 'document',
              dataTestSubj: 'customActionItem1',
              onClick: jest.fn(),
            },
            {
              id: 'action-item-2',
              enabled: true,
              label: 'Action 2',
              iconType: 'document',
              dataTestSubj: 'customActionItem2',
              onClick: jest.fn(),
            },
            {
              id: 'action-item-3',
              enabled: false,
              label: 'Action 3',
              iconType: 'document',
              dataTestSubj: 'customActionItem3',
              onClick: jest.fn(),
            },
          ]),
        };

        const { component } = await mountComponent({});

        const action1 = findTestSubject(component, 'customActionItem1');
        const action2 = findTestSubject(component, 'customActionItem2');

        expect(action1.text()).toBe('Action 1');
        expect(action2.text()).toBe('Action 2');
        expect(findTestSubject(component, 'customActionItem3').exists()).toBe(false);
        mockBreakpointSize = null;
      });

      it('should display multiple actions added by getActionItems', async () => {
        mockFlyoutCustomization.actions = {
          getActionItems: jest.fn(() =>
            Array.from({ length: 5 }, (_, i) => ({
              id: `action-item-${i}`,
              enabled: true,
              label: `Action ${i}`,
              iconType: 'document',
              dataTestSubj: `customActionItem${i}`,
              onClick: jest.fn(),
            }))
          ),
        };

        const { component } = await mountComponent({});
        expect(
          findTestSubject(component, 'docViewerFlyoutActions')
            .find(EuiButtonIcon)
            .map((button) => button.prop('data-test-subj'))
        ).toEqual([
          'docTableRowAction',
          'customActionItem0',
          'customActionItem1',
          'docViewerMoreFlyoutActionsButton',
        ]);

        act(() => {
          findTestSubject(component, 'docViewerMoreFlyoutActionsButton').simulate('click');
        });

        component.update();

        expect(
          component
            .find(EuiPopover)
            .find(EuiContextMenuItem)
            .map((button) => button.prop('data-test-subj'))
        ).toEqual(['customActionItem2', 'customActionItem3', 'customActionItem4']);
      });

      it('should display multiple actions added by getActionItems in mobile view', async () => {
        mockBreakpointSize = 's';

        mockFlyoutCustomization.actions = {
          getActionItems: jest.fn(() =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `action-item-${i}`,
              enabled: true,
              label: `Action ${i}`,
              iconType: 'document',
              dataTestSubj: `customActionItem${i}`,
              onClick: jest.fn(),
            }))
          ),
        };

        const { component } = await mountComponent({});
        expect(findTestSubject(component, 'docViewerFlyoutActions').length).toBe(0);

        act(() => {
          findTestSubject(component, 'docViewerMobileActionsButton').simulate('click');
        });

        component.update();

        expect(
          component
            .find(EuiPopover)
            .find(EuiContextMenuItem)
            .map((button) => button.prop('data-test-subj'))
        ).toEqual([
          'docTableRowAction',
          'customActionItem0',
          'customActionItem1',
          'customActionItem2',
        ]);

        mockBreakpointSize = null;
      });

      it('should allow disabling default actions', async () => {
        mockFlyoutCustomization.actions = {
          defaultActions: {
            viewSingleDocument: { disabled: true },
            viewSurroundingDocument: { disabled: true },
          },
        };

        const { component } = await mountComponent({});

        const singleDocumentView = findTestSubject(component, 'docTableRowAction');
        expect(singleDocumentView.length).toBeFalsy();
      });
    });

    describe('when content is customized', () => {
      it('should display the component passed to the Content customization', async () => {
        mockFlyoutCustomization.Content = () => (
          <span data-test-subj="flyoutCustomContent">Custom content</span>
        );

        const { component } = await mountComponent({});

        const customContent = findTestSubject(component, 'flyoutCustomContent');

        expect(customContent.text()).toBe('Custom content');
      });

      it('should provide a doc property to display details about the current document overview', async () => {
        mockFlyoutCustomization.Content = ({ doc }) => {
          return (
            <span data-test-subj="flyoutCustomContent">{doc.flattened.message as string}</span>
          );
        };

        const { component } = await mountComponent({});

        const customContent = findTestSubject(component, 'flyoutCustomContent');

        expect(customContent.text()).toBe('test1');
      });

      it('should provide an actions prop collection to optionally update the grid content', async () => {
        mockFlyoutCustomization.Content = ({ actions }) => (
          <>
            <button data-test-subj="addColumn" onClick={() => actions.onAddColumn?.('message')} />
            <button
              data-test-subj="removeColumn"
              onClick={() => actions.onRemoveColumn?.('message')}
            />
            <button
              data-test-subj="addFilter"
              onClick={() => actions.filter?.('_exists_', 'message', '+')}
            />
          </>
        );

        const { component, props, services } = await mountComponent({});

        findTestSubject(component, 'addColumn').simulate('click');
        findTestSubject(component, 'removeColumn').simulate('click');
        findTestSubject(component, 'addFilter').simulate('click');

        expect(props.onAddColumn).toHaveBeenCalled();
        expect(props.onRemoveColumn).toHaveBeenCalled();
        expect(services.toastNotifications.addSuccess).toHaveBeenCalledTimes(2);
        expect(props.onFilter).toHaveBeenCalled();
      });
    });
  });
});
