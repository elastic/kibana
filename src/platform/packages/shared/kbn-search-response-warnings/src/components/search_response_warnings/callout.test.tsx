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
    render(<SearchResponseWarningsCallout warnings={warnings} />);

    expect(screen.getByTestId('searchResponseWarningsCallout')).toBeInTheDocument();
  });

  it('renders nothing when there are no warnings', () => {
    const { container } = render(<SearchResponseWarningsCallout warnings={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the callout after dismiss and keeps it hidden while warnings remain', () => {
    const { rerender } = render(<SearchResponseWarningsCallout warnings={warnings} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByTestId('searchResponseWarningsCallout')).not.toBeInTheDocument();

    rerender(<SearchResponseWarningsCallout warnings={warnings} />);

    expect(screen.queryByTestId('searchResponseWarningsCallout')).not.toBeInTheDocument();
  });

  it('shows the callout again after warnings are cleared by a new fetch', () => {
    const { rerender } = render(<SearchResponseWarningsCallout warnings={warnings} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByTestId('searchResponseWarningsCallout')).not.toBeInTheDocument();

    rerender(<SearchResponseWarningsCallout warnings={[]} />);
    rerender(<SearchResponseWarningsCallout warnings={warnings} />);

    expect(screen.getByTestId('searchResponseWarningsCallout')).toBeInTheDocument();
  });

  it('does not persist dismiss across remounts', () => {
    const { unmount } = render(<SearchResponseWarningsCallout warnings={warnings} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByTestId('searchResponseWarningsCallout')).not.toBeInTheDocument();

    unmount();
    render(<SearchResponseWarningsCallout warnings={warnings} />);

    expect(screen.getByTestId('searchResponseWarningsCallout')).toBeInTheDocument();
  });
});
