/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { of } from 'rxjs';
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
  function renderComponent({
    closeFlyoutSpy,
    extraHit,
    setExpandedDoc = jest.fn(),
  }: {
    closeFlyoutSpy?: jest.Mock;
    extraHit?: DataTableRecord;
    setExpandedDoc?: jest.Mock;
  } = {}) {
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
    const user = userEvent.setup();

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
          chrome={
            {
              getChromeStyle$: jest.fn().mockReturnValue(of('classic')),
            } as unknown as CoreStart['chrome']
          }
          hit={hit}
          hits={hits}
          columns={columns}
          flyoutType={'push'}
          onRemoveColumn={jest.fn()}
          onAddColumn={jest.fn()}
          onClose={closeFlyoutSpy ?? jest.fn()}
          setExpandedDoc={setExpandedDoc}
        />
      </KibanaContextProvider>
    );

    return { hit, hits, setExpandedDoc, user };
  }

  it('should render a flyout', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByTestId('esqlRowDetailsFlyout')).toBeInTheDocument());
  });

  it('should run the onClose prop when the close button is clicked', async () => {
    const closeFlyoutSpy = jest.fn();
    renderComponent({ closeFlyoutSpy });
    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(closeFlyoutSpy).toHaveBeenCalled();
  });

  it('navigates to the next hit with ArrowRight', async () => {
    const extraHit = {
      flattened: {
        bytes: 456,
        destination: 'Athens',
      },
      id: '3',
      raw: {
        bytes: 456,
        destination: 'Athens',
      },
    } as unknown as DataTableRecord;
    const { hits, setExpandedDoc, user } = renderComponent({ extraHit });

    await waitFor(() => expect(screen.getByTestId('esqlRowDetailsFlyout')).toBeInTheDocument());

    screen.getByTestId('euiFlyoutBodyOverflow').focus();
    await user.keyboard('{ArrowRight}');
    expect(setExpandedDoc).toHaveBeenCalledWith(hits[1]);
  });

  it('does not navigate to a different hit when there is only 1 hit', async () => {
    const { hit, setExpandedDoc, user } = renderComponent();

    await waitFor(() => expect(screen.getByTestId('esqlRowDetailsFlyout')).toBeInTheDocument());

    screen.getByTestId('euiFlyoutBodyOverflow').focus();
    await user.keyboard('{ArrowLeft}');
    expect(setExpandedDoc).not.toHaveBeenCalled();

    await user.keyboard('{ArrowRight}');
    // activePage is -1 when pageCount <= 1, so ArrowRight resolves to index 0 (same hit)
    expect(setExpandedDoc).toHaveBeenCalledTimes(1);
    expect(setExpandedDoc).toHaveBeenCalledWith(hit);
  });
});
