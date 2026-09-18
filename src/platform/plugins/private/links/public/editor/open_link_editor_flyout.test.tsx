/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { openLinkEditorFlyout } from './open_link_editor_flyout';
import { LinksStrings } from '../components/links_strings';
import type { ResolvedLink } from '../types';

// Capture the loadContent callback so we can invoke it in tests
let capturedLoadContent: (() => Promise<React.JSX.Element | null | void>) | null = null;
let capturedFlyoutProps: Record<string, unknown> = {};
let resolveOnClose: () => void = () => {};

const mockGoBack = jest.fn();

const mockFlyoutRef: OverlayRef = {
  close: jest.fn(),
  onClose: new Promise<void>((resolve) => {
    resolveOnClose = resolve;
  }),
};

jest.mock('@kbn/presentation-util', () => ({
  openLazySystemFlyout: jest.fn((params) => {
    capturedLoadContent = params.loadContent;
    capturedFlyoutProps = params.flyoutProps ?? {};
    return mockFlyoutRef;
  }),
}));

jest.mock('@elastic/eui', () => ({
  getFlyoutManagerStore: () => ({ goBack: mockGoBack }),
}));

jest.mock('../services/kibana_services', () => ({
  coreServices: {},
}));

jest.mock('../components/editor/link_editor', () => ({
  LinkEditor: ({
    onSave,
    onClose,
  }: {
    onSave: (link: ResolvedLink) => void;
    onClose: () => void;
  }) => (
    <div>
      <button
        data-test-subj="save-btn"
        onClick={() =>
          onSave({
            id: 'new-link',
            type: 'dashboardLink',
            destination: 'dest-1',
            title: 'Dashboard 1',
          } as ResolvedLink)
        }
      >
        Save
      </button>
      <button data-test-subj="cancel-btn" onClick={onClose}>
        Cancel
      </button>
    </div>
  ),
}));

const historyKey = Symbol('linksEditor');

const editLink = {
  id: 'existing-link',
  type: 'dashboardLink',
  destination: 'dest-2',
  title: 'Dashboard 2',
} as ResolvedLink;

describe('openLinkEditorFlyout', () => {
  beforeEach(() => {
    capturedLoadContent = null;
    capturedFlyoutProps = {};
    jest.clearAllMocks();
    // reset onClose promise for each test
    mockFlyoutRef.onClose = new Promise<void>((resolve) => {
      resolveOnClose = resolve;
    });
  });

  it('opens with the add-link title and historyKey when no link is provided', async () => {
    openLinkEditorFlyout({ historyKey });

    expect(capturedFlyoutProps.historyKey).toBe(historyKey);
    expect(capturedFlyoutProps.title).toBe(LinksStrings.editor.getAddButtonLabel());
    expect((capturedFlyoutProps.flyoutMenuProps as Record<string, unknown>)?.hideCloseButton).toBe(
      true
    );
  });

  it('opens with the edit-link title and historyKey when editing', async () => {
    openLinkEditorFlyout({ historyKey, link: editLink });

    expect(capturedFlyoutProps.historyKey).toBe(historyKey);
    expect(capturedFlyoutProps.title).toBe(LinksStrings.editor.getEditLinkTitle());
    expect((capturedFlyoutProps.flyoutMenuProps as Record<string, unknown>)?.hideCloseButton).toBe(
      true
    );
  });

  it('resolves with the new link and calls goBack when Save is clicked', async () => {
    const promise = openLinkEditorFlyout({ historyKey });

    const element = await capturedLoadContent!();
    const { unmount } = render(element as React.JSX.Element);

    await userEvent.click(screen.getByTestId('save-btn'));

    const result = await promise;
    expect(result).toMatchObject({ id: 'new-link', destination: 'dest-1' });
    // goBack() is used instead of closeFlyout() to avoid triggering closeAllFlyouts() in the
    // EUI flyout manager's useLayoutEffect cleanup (see open_link_editor_flyout.tsx for details).
    expect(mockGoBack).toHaveBeenCalled();

    unmount();
  });

  it('calls goBack when Cancel is clicked', async () => {
    openLinkEditorFlyout({ historyKey });

    const element = await capturedLoadContent!();
    const { unmount } = render(element as React.JSX.Element);

    await userEvent.click(screen.getByTestId('cancel-btn'));

    expect(mockGoBack).toHaveBeenCalled();
    unmount();
  });

  it('resolves with undefined when flyoutRef.onClose settles (EUI back button or cascade close)', async () => {
    const promise = openLinkEditorFlyout({ historyKey });

    // Simulate EUI closing the flyout externally (X button, back button, escape, etc.)
    resolveOnClose();

    const result = await promise;
    expect(result).toBeUndefined();
  });
});
