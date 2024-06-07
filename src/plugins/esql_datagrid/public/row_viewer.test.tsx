/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import { RowViewer } from './row_viewer';

describe('RowViewer', () => {
  function renderComponent(closeFlyoutSpy?: jest.Mock, extraHit?: DataTableRecord) {
    const dataView = {
      title: 'foo',
      id: 'foo',
      name: 'foo',
      toSpec: jest.fn(),
      toMinimalSpec: jest.fn(),
      isPersisted: jest.fn().mockReturnValue(false),
      fields: {
        getByName: jest.fn(),
      },
      timeFieldName: 'timestamp',
    };
    const columns = ['bytes', 'destination'];
    const hit = {
      flattened: {
        bytes: 123,
        destination: 'Amsterdam',
      },
      id: '1',
      raw: {
        bytes: 123,
        destination: 'Amsterdam',
      },
    } as unknown as DataTableRecord;

    const hits = [hit];
    if (extraHit) {
      hits.push(extraHit);
    }
    const services = {
      toastNotifications: {
        addSuccess: jest.fn(),
      },
    };

    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

    render(
      <KibanaContextProvider services={services}>
        <RowViewer
          dataView={dataView as unknown as DataView}
          notifications={
            {
              toasts: {
                addSuccess: jest.fn(),
              },
            } as unknown as CoreStart['notifications']
          }
          hit={hit}
          hits={hits}
          columns={columns}
          flyoutType={'push'}
          onRemoveColumn={jest.fn()}
          onAddColumn={jest.fn()}
          onClose={closeFlyoutSpy ?? jest.fn()}
          setExpandedDoc={jest.fn()}
        />
      </KibanaContextProvider>
    );
  }

  it('should render a flyout', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByTestId('esqlRowDetailsFlyout')).toBeInTheDocument());
  });

  it('should run the onClose prop when the close button is clicked', async () => {
    const closeFlyoutSpy = jest.fn();
    renderComponent(closeFlyoutSpy);
    await waitFor(() => {
      userEvent.click(screen.getByTestId('docViewerFlyoutCloseButton'));
      expect(closeFlyoutSpy).toHaveBeenCalled();
    });
  });

  it('displays row navigation when there is more than 1 row available', async () => {
    renderComponent(undefined, {
      flattened: {
        bytes: 456,
        destination: 'Athens',
      },
      id: '3',
      raw: {
        bytes: 456,
        destination: 'Athens',
      },
    } as unknown as DataTableRecord);
    await waitFor(() => {
      expect(screen.getByTestId('docViewerFlyoutNavigation')).toBeInTheDocument();
    });
  });

  it('doesnt display row navigation when there is only 1 row available', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByTestId('docViewerFlyoutNavigation')).not.toBeInTheDocument();
    });
  });
});
