/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionsMenuPopover } from './actions_menu_popover';

jest.mock('./actions_menu', () => ({
  ActionsMenu: () => <div data-test-subj="mocked-actions-menu">{'Actions Menu Content'}</div>,
}));

describe('ActionsMenuPopover', () => {
  it('does not show menu content when closed', () => {
    render(
      <I18nProvider>
        <ActionsMenuPopover isOpen={false} closePopover={jest.fn()} onActionSelected={jest.fn()} />
      </I18nProvider>
    );
    expect(screen.queryByTestId('mocked-actions-menu')).not.toBeInTheDocument();
  });

  it('shows menu content when opened', () => {
    render(
      <I18nProvider>
        <ActionsMenuPopover isOpen={true} closePopover={jest.fn()} onActionSelected={jest.fn()} />
      </I18nProvider>
    );
    expect(screen.getByTestId('mocked-actions-menu')).toBeInTheDocument();
  });

  it('calls closePopover when the backdrop is clicked', () => {
    const closePopover = jest.fn();
    render(
      <I18nProvider>
        <ActionsMenuPopover
          isOpen={true}
          closePopover={closePopover}
          onActionSelected={jest.fn()}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('actionsMenuBackdrop'));
    expect(closePopover).toHaveBeenCalled();
  });
});
