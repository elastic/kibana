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
import { DataViewLabels } from './data_view_labels';

describe('DataViewLabels', () => {
  it('should render both labels', () => {
    const { getByTestId } = render(
      <DataViewLabels isAdhoc={true} isManaged={true} name={'name'} />
    );
    expect(getByTestId('dataViewItemTempBadge-name')).toHaveTextContent('Temporary');
    expect(getByTestId('dataViewItemManagedBadge-name')).toHaveTextContent('Managed');
  });

  it('should render only temporary label', () => {
    const { getByTestId, queryByTestId } = render(
      <DataViewLabels isAdhoc={true} isManaged={false} name={'name'} />
    );
    expect(getByTestId('dataViewItemTempBadge-name')).toBeInTheDocument();
    expect(queryByTestId('dataViewItemManagedBadge-name')).not.toBeInTheDocument();
  });

  it('should render only managed label', () => {
    const { getByTestId, queryByTestId } = render(
      <DataViewLabels isAdhoc={false} isManaged={true} name={'name'} />
    );
    expect(queryByTestId('dataViewItemTempBadge-name')).not.toBeInTheDocument();
    expect(getByTestId('dataViewItemManagedBadge-name')).toBeInTheDocument();
  });

  it('should render no labels', () => {
    const { container } = render(
      <DataViewLabels isAdhoc={false} isManaged={false} name={'name'} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
