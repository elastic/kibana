/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  HostCellWithFlyoutRenderer,
  HostCellWithFlyoutRendererProps,
} from './with_expandable_flyout';
import React from 'react';
import { render, screen } from '@testing-library/react';

const renderTestComponents = (props?: Partial<HostCellWithFlyoutRendererProps>) => {
  const finalProps: HostCellWithFlyoutRendererProps = {
    rowIndex: 0,
    columnId: 'test',
    setCellProps: jest.fn(),
    isExpandable: false,
    isExpanded: true,
    isDetails: false,
    colIndex: 0,
    fieldFormats: {} as HostCellWithFlyoutRendererProps['fieldFormats'],
    dataView: {} as HostCellWithFlyoutRendererProps['dataView'],
    closePopover: jest.fn(),
    row: {
      id: '1',
      raw: {
        _source: {
          host: {
            name: 'test-host-name',
          },
        },
      },
      flattened: {
        'host.name': 'test-host-name',
      },
    },
    ...props,
  };
  return render(<HostCellWithFlyoutRenderer {...finalProps} />);
};

describe('With Expandable Flyout', () => {
  it('should open Expandable Flyout on Click', () => {
    renderTestComponents();

    expect(screen.getByTestId('host-details-button')).toBeVisible();
    screen.getByTestId('host-details-button').click();
    expect(screen.getByTestId('host-name-flyout')).toBeVisible();
    expect(screen.getByText('Host Flyout Header - test-host-name')).toBeVisible();
  });
});
