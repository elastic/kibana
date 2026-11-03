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

import { Status } from './status';
import { CaseStatuses } from './types';
import { getStatusConfiguration } from './config';

const statusConfiguration = getStatusConfiguration();

describe('Stats', () => {
  it.each([[CaseStatuses.open], [CaseStatuses['in-progress']], [CaseStatuses.closed]])(
    'renders correctly with status: %s',
    async (status) => {
      const res = render(<Status status={status} />);
      const label = statusConfiguration[status].label;

      expect(res.getByText(label)).toBeInTheDocument();
    }
  );

  it('renders the category label and color when no overrides are given', () => {
    const res = render(<Status status={CaseStatuses.open} />);

    expect(res.getByTestId('case-status-badge-open')).toHaveTextContent(
      statusConfiguration[CaseStatuses.open].label
    );
  });

  it('renders a custom label', () => {
    const res = render(<Status status={CaseStatuses['in-progress']} label="Awaiting customer" />);

    expect(res.getByTestId('case-status-badge-in-progress')).toHaveTextContent('Awaiting customer');
    expect(
      res.queryByText(statusConfiguration[CaseStatuses['in-progress']].label)
    ).not.toBeInTheDocument();
  });

  it('renders a custom color', () => {
    const withCategoryColor = render(<Status status={CaseStatuses.open} />);
    const categoryClassName = withCategoryColor.getByTestId('case-status-badge-open').className;
    withCategoryColor.unmount();

    const res = render(<Status status={CaseStatuses.open} color="danger" label="Escalated" />);

    expect(res.getByTestId('case-status-badge-open').className).not.toEqual(categoryClassName);
  });

  it('uses the given test subject', () => {
    const res = render(<Status status={CaseStatuses.closed} dataTestSubj="my-badge" />);

    expect(res.getByTestId('my-badge')).toBeInTheDocument();
  });
});
