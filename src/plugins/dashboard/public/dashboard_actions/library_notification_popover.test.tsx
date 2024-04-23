/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
import { ViewMode } from '@kbn/presentation-publishing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { LibraryNotificationPopover } from './library_notification_popover';
import {
  LegacyUnlinkFromLibraryAction,
  LegacyUnlinkPanelFromLibraryActionApi,
} from './legacy_unlink_from_library_action';

const mockUnlinkFromLibraryAction = {
  execute: jest.fn(),
  isCompatible: jest.fn().mockResolvedValue(true),
  getDisplayName: jest.fn().mockReturnValue('Test Unlink'),
} as unknown as LegacyUnlinkFromLibraryAction;

describe('library notification popover', () => {
  let api: LegacyUnlinkPanelFromLibraryActionApi;

  beforeEach(async () => {
    api = {
      viewMode: new BehaviorSubject<ViewMode>('edit'),
      canUnlinkFromLibrary: jest.fn().mockResolvedValue(true),
      unlinkFromLibrary: jest.fn(),
      canLinkToLibrary: jest.fn().mockResolvedValue(true),
      linkToLibrary: jest.fn(),
    };
  });

  const renderAndOpenPopover = async () => {
    render(
      <I18nProvider>
        <LibraryNotificationPopover api={api} unlinkAction={mockUnlinkFromLibraryAction} />
      </I18nProvider>
    );
    await userEvent.click(
      await screen.findByTestId('embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION')
    );
    await waitForEuiPopoverOpen();
  };

  it('renders the unlink button', async () => {
    await renderAndOpenPopover();
    expect(await screen.findByText('Test Unlink')).toBeInTheDocument();
  });

  it('calls the unlink action execute method on click', async () => {
    await renderAndOpenPopover();
    const button = await screen.findByTestId('libraryNotificationUnlinkButton');
    await userEvent.click(button);
    expect(mockUnlinkFromLibraryAction.execute).toHaveBeenCalled();
  });
});
