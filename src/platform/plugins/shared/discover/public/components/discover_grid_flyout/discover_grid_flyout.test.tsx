/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverServices } from '../../build_services';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord, buildDataTableRecordList } from '@kbn/discover-utils';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import { discoverServiceMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { UnifiedDocViewerFlyoutProps } from '@kbn/unified-doc-viewer-plugin/public';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../context_awareness';

let mockRenderCustomHeader: UnifiedDocViewerFlyoutProps['renderCustomHeader'] | undefined;

jest.mock('@kbn/unified-doc-viewer-plugin/public', () => {
  const actual = jest.requireActual('@kbn/unified-doc-viewer-plugin/public');
  const OriginalFlyout = actual.UnifiedDocViewerFlyout;
  return {
    ...actual,
    UnifiedDocViewerFlyout: (props: UnifiedDocViewerFlyoutProps) => (
      <>
        <div data-test-subj="mockFlyoutTitle">
          {props.flyoutTitle ?? (props.isEsqlQuery ? 'Result' : 'Document')}
        </div>
        {/* EUI's Jest flyout stub ignores flyoutMenuProps; surface actions for assertions. */}
        <div data-test-subj="mockFlyoutMenuActions">
          {[
            ...(props.flyoutMenuLeadingActions ?? []).map((action) => ({
              action,
              slot: 'leading',
            })),
            ...(props.flyoutMenuTrailingActions ?? []).map((action) => ({
              action,
              slot: 'trailing',
            })),
          ].map(({ action, slot }) => (
            <div
              key={action['aria-label']}
              data-test-subj={`mockFlyoutMenuAction-${action['aria-label']}`}
              data-slot={slot}
              data-icon-type={action.iconType}
              data-tooltip={
                typeof action.toolTipContent === 'string' ? action.toolTipContent : undefined
              }
            />
          ))}
        </div>
        <OriginalFlyout
          {...props}
          {...(mockRenderCustomHeader ? { renderCustomHeader: mockRenderCustomHeader } : {})}
        />
      </>
    ),
  };
});

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

  const renderComponent = async ({
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
    const user = userEvent.setup();

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

    render(
      <DiscoverTestProvider services={services}>
        <DiscoverGridFlyout {...props} />
      </DiscoverTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('docViewerFlyout')).toBeVisible();
    });

    return { props, services, user };
  };

  beforeEach(() => {
    mockRenderCustomHeader = undefined;
    jest.clearAllMocks();
  });

  it('should be rendered correctly using an data view without timefield', async () => {
    const { props, user } = await renderComponent({});

    const singleDocument = screen.getByTestId('mockFlyoutMenuAction-View single document');
    expect(singleDocument).toHaveAttribute('data-slot', 'trailing');
    expect(singleDocument).toHaveAttribute('data-icon-type', 'maximize');
    expect(singleDocument).toHaveAttribute('data-tooltip', 'View single document');
    expect(
      screen.queryByTestId('mockFlyoutMenuAction-View surrounding documents')
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('should be rendered correctly using an data view with timefield', async () => {
    const { props, user } = await renderComponent({ dataView: dataViewWithTimefieldMock });

    expect(screen.getByTestId('mockFlyoutMenuAction-View single document')).toHaveAttribute(
      'data-slot',
      'trailing'
    );

    const surroundingDocuments = screen.getByTestId(
      'mockFlyoutMenuAction-View surrounding documents'
    );
    expect(surroundingDocuments).toHaveAttribute('data-slot', 'leading');
    expect(surroundingDocuments).toHaveAttribute('data-icon-type', 'documents');
    expect(surroundingDocuments).toHaveAttribute(
      'data-tooltip',
      'Inspect documents that occurred before and after this document. Only pinned filters remain active in the Surrounding documents view.'
    );

    await user.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('allows navigating to the next document with the right arrow key', async () => {
    const { props, user } = await renderComponent({});

    screen.getByTestId('euiFlyoutBodyOverflow').focus();
    await user.keyboard('{ArrowRight}');

    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::2::' }));
  });

  it('allows navigating to the previous document with the left arrow key', async () => {
    const { props, user } = await renderComponent({
      expandedHit: esHitsMock[1],
    });

    screen.getByTestId('euiFlyoutBodyOverflow').focus();
    await user.keyboard('{ArrowLeft}');

    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::1::' }));
  });

  it('does not navigate to the previous document with the left arrow key on the first document', async () => {
    const { props, user } = await renderComponent({});

    screen.getByTestId('euiFlyoutBodyOverflow').focus();
    await user.keyboard('{ArrowLeft}');

    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('does not navigate to the next document with the right arrow key on the last document', async () => {
    const { props, user } = await renderComponent({
      expandedHit: esHitsMock[esHitsMock.length - 1],
    });

    screen.getByTestId('euiFlyoutBodyOverflow').focus();
    await user.keyboard('{ArrowRight}');

    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('should not navigate with arrow keys through documents if an input is in focus', async () => {
    mockRenderCustomHeader = () => <input data-test-subj="flyoutCustomInput" />;
    const { props, user } = await renderComponent({});

    screen.getByTestId('flyoutCustomInput').focus();
    await user.keyboard('{ArrowRight}{ArrowLeft}');

    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('should not render single/surrounding views for ES|QL', async () => {
    await renderComponent({
      query: { esql: 'FROM indexpattern' },
    });

    expect(screen.getByTestId('mockFlyoutMenuActions')).toBeEmptyDOMElement();
    expect(screen.getByTestId('mockFlyoutTitle')).toHaveTextContent('Result');
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
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const records = buildDataTableRecordList({
        records: hits as EsHitRecord[],
        dataView: dataViewMock,
        processRecord: (record) => scopedProfilesManager.resolveDocumentProfile({ record }),
      });
      await renderComponent({ records, services });

      expect(screen.getByText('Mock tab')).toBeInTheDocument();
      expect(screen.getByTestId('mockFlyoutTitle')).toHaveTextContent('Document #new::1::');
    });

    it('should render custom header when provided by document profile', async () => {
      const services = getServices();
      const scopedProfilesManager = services.profilesManager.createScopedProfilesManager({
        scopedEbtManager: services.ebtManager.createScopedEBTManager(),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const records = buildDataTableRecordList({
        records: esHitsMock as EsHitRecord[],
        dataView: dataViewMock,
        processRecord: (record) => scopedProfilesManager.resolveDocumentProfile({ record }),
      });
      await renderComponent({ services, records });

      expect(screen.getByTestId('customDocViewerHeader')).toHaveTextContent('Custom Header');
    });

    it('should render custom footer when provided by document profile', async () => {
      const services = getServices();
      const scopedProfilesManager = services.profilesManager.createScopedProfilesManager({
        scopedEbtManager: services.ebtManager.createScopedEBTManager(),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const records = buildDataTableRecordList({
        records: esHitsMock as EsHitRecord[],
        dataView: dataViewMock,
        processRecord: (record) => scopedProfilesManager.resolveDocumentProfile({ record }),
      });
      await renderComponent({ services, records });

      expect(screen.getByTestId('customDocViewerFooter')).toHaveTextContent('Custom Footer');
    });
  });
});
