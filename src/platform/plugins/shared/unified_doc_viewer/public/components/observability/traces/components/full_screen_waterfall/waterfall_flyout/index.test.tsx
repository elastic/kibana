/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { WaterfallFlyout } from '.';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';

describe('WaterfallFlyout', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  const dataView = createStubDataView({
    spec: {
      id: 'test-dataview',
      title: 'test-pattern',
      timeFieldName: '@timestamp',
    },
  });

  const hit: DataTableRecord = buildDataTableRecord(generateEsHits(dataView, 1)[0], dataView);

  const defaultProps = {
    title: 'Test Span',
    flyoutId: 'test-flyout-id',
    onCloseFlyout: jest.fn(),
    hit,
    loading: false,
    dataView,
    children: <div>Test Content</div>,
  };

  it('renders tabs correctly', () => {
    const { getByRole } = render(<WaterfallFlyout {...defaultProps} />);

    expect(getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(getByRole('tab', { name: 'Table' })).toBeInTheDocument();
    expect(getByRole('tab', { name: 'JSON' })).toBeInTheDocument();
  });

  it('applies overflow-y: hidden to prevent double scroll in the flyout body', () => {
    const { container } = render(<WaterfallFlyout {...defaultProps} />);

    const flyoutBody = container.querySelector('.euiFlyoutBody');
    expect(flyoutBody).toHaveStyleRule('overflow-y', 'hidden', {
      target: '.euiFlyoutBody__overflow',
    });
  });
});
