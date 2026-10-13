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
import { KeyboardShortcutsPopover } from './keyboard_shortcuts_popover';
import { TestProvider } from '../../../shared/mocks/test_providers';

describe('KeyboardShortcutsPopover', () => {
  const openPopover = () => {
    fireEvent.click(screen.getByTestId('workflowYamlEditorKeyboardShortcutsButton'));
  };

  it('shows editing shortcuts when the editor is editable', () => {
    render(<KeyboardShortcutsPopover isReadOnly={false} />, { wrapper: TestProvider });

    openPopover();

    expect(screen.getByText('Open actions menu')).toBeInTheDocument();
    expect(screen.getByText('Run workflow')).toBeInTheDocument();
    expect(screen.getByText('Find')).toBeInTheDocument();
  });

  it('only shows available shortcuts when the editor is read-only', () => {
    render(<KeyboardShortcutsPopover isReadOnly />, { wrapper: TestProvider });

    openPopover();

    expect(screen.queryByText('Open actions menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Run workflow')).not.toBeInTheDocument();
    expect(screen.getByText('Find')).toBeInTheDocument();
  });
});
