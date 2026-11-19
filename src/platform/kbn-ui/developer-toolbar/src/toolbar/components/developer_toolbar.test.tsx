/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DeveloperToolbar } from './developer_toolbar';
import { DeveloperToolbarItem } from './developer_toolbar_item';

const MINIMIZED_KEY = 'kbn_developer_toolbar_minimized';

describe('DeveloperToolbar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the minimized button into document.body and reports 0 height', () => {
    const onHeightChange = jest.fn();
    const { container } = render(<DeveloperToolbar onHeightChange={onHeightChange} />);

    const expandButton = screen.getByRole('button', { name: 'Expand developer toolbar' });
    expect(container).not.toContainElement(expandButton);
    expect(onHeightChange).toHaveBeenLastCalledWith(0);
  });

  it('renders the expanded toolbar in place with registered items', () => {
    localStorage.setItem(MINIMIZED_KEY, 'false');
    const onHeightChange = jest.fn();
    const { container } = render(
      <>
        <DeveloperToolbar
          envInfo={{ mode: { name: 'development' } }}
          onHeightChange={onHeightChange}
        />
        <DeveloperToolbarItem id="custom-item">
          <span>Custom item</span>
        </DeveloperToolbarItem>
      </>
    );

    expect(container.querySelector('#developerToolbar')).toBeInTheDocument();
    expect(screen.getByText('Custom item')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(onHeightChange).toHaveBeenLastCalledWith(32);
  });

  it('portals the expanded toolbar to document.body when portal is set', () => {
    localStorage.setItem(MINIMIZED_KEY, 'false');
    const { container } = render(<DeveloperToolbar portal />);

    expect(container.querySelector('#developerToolbar')).not.toBeInTheDocument();
    expect(document.body.querySelector('#developerToolbar')).toBeInTheDocument();
  });

  it('shows the provided disable hint in the toggle tooltip', async () => {
    localStorage.setItem(MINIMIZED_KEY, 'false');
    render(<DeveloperToolbar disableHint="Set toolbar.enabled: false" />);

    fireEvent.mouseOver(screen.getByRole('button', { name: 'Minimize developer toolbar' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Set toolbar.enabled: false');
  });
});
