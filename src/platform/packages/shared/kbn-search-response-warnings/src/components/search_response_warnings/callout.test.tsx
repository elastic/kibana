/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResponseWarningsCallout } from './callout';
import { searchResponseIncompleteWarningLocalCluster } from '../../__mocks__/search_response_warnings';

const warnings = [searchResponseIncompleteWarningLocalCluster];

describe('SearchResponseWarningsCallout', () => {
  it('renders the callout when warnings are present', () => {
    render(
      <SearchResponseWarningsCallout
        warnings={warnings}
        isDismissed={false}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByTestId('searchResponseWarningsCallout')).toBeInTheDocument();
  });

  it('renders nothing when there are no warnings', () => {
    const { container } = render(
      <SearchResponseWarningsCallout warnings={[]} isDismissed={false} onDismiss={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the callout when isDismissed is true', () => {
    render(
      <SearchResponseWarningsCallout warnings={warnings} isDismissed={true} onDismiss={jest.fn()} />
    );

    expect(screen.queryByTestId('searchResponseWarningsCallout')).not.toBeInTheDocument();
  });

  it('calls onDismiss when the callout is dismissed', () => {
    const onDismiss = jest.fn();
    render(
      <SearchResponseWarningsCallout
        warnings={warnings}
        isDismissed={false}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
