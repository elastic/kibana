/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionsMenuPopover } from './actions_menu_popover';

jest.mock('./actions_menu', () => ({
  ActionsMenu: ({ onActionSelected }: { onActionSelected: () => void }) => (
    <div data-test-subj="mocked-actions-menu">{'Actions Menu Content'}</div>
  ),
}));

describe('ActionsMenuPopover', () => {
  const PopoverTestHarness = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <I18nProvider>
        <ActionsMenuPopover
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          button={
            <EuiButton data-test-subj="popoverTrigger" onClick={() => setIsOpen(true)}>
              {'Open'}
            </EuiButton>
          }
          onActionSelected={jest.fn()}
        />
      </I18nProvider>
    );
  };

  it('renders the trigger button', () => {
    render(<PopoverTestHarness />);
    expect(screen.getByTestId('popoverTrigger')).toBeInTheDocument();
  });

  it('does not show popover content when closed', () => {
    render(<PopoverTestHarness />);
    expect(screen.queryByTestId('mocked-actions-menu')).not.toBeInTheDocument();
  });

  it('shows popover content when opened', () => {
    render(<PopoverTestHarness />);
    fireEvent.click(screen.getByTestId('popoverTrigger'));
    expect(screen.getByTestId('mocked-actions-menu')).toBeInTheDocument();
  });

  it('has the correct aria-label', () => {
    render(
      <I18nProvider>
        <ActionsMenuPopover
          isOpen={true}
          closePopover={jest.fn()}
          button={<button type="button">{'Trigger'}</button>}
          onActionSelected={jest.fn()}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('mocked-actions-menu')).toBeInTheDocument();
  });
});
