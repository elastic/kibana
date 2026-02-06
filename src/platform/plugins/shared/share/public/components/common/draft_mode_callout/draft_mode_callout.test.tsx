/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { DraftModeCallout } from './draft_mode_callout';

describe('DraftModeCallout', () => {
  describe('Default case', () => {
    it('renders a default callout when custom props are not present', () => {
      render(<DraftModeCallout />);
      const callout = screen.getByTestId('unsavedChangesDraftModeCallOut');
      expect(callout).toMatchSnapshot();
    });
  });

  describe('Custom content case', () => {
    it('renders a callout with custom content when custom props are present', () => {
      render(
        <DraftModeCallout message={'Custom message'} data-test-subj="customDraftModeCallOut" />
      );
      const callout = screen.getByTestId('customDraftModeCallOut');
      expect(screen.getByText('Custom message')).toBeInTheDocument();
      expect(callout).toMatchSnapshot();
    });
  });

  describe('Save button case', () => {
    it('renders a save button when onSave is present', () => {
      render(<DraftModeCallout saveButtonProps={{ onSave: jest.fn() }} />);
      const saveButton = screen.getByRole('button', { name: 'Save changes' });
      expect(saveButton).toBeInTheDocument();
    });
    it('renders a loading state when isSaving is true', () => {
      render(<DraftModeCallout saveButtonProps={{ onSave: jest.fn(), isSaving: true }} />);
      const saveButton = screen.getByRole('button', { name: 'Save changes' });
      expect(saveButton).toBeDisabled();
    });
    it('renders a custom label when a label is provided', () => {
      const customLabel = 'Custom label';
      render(<DraftModeCallout saveButtonProps={{ onSave: jest.fn(), label: customLabel }} />);
      const saveButton = screen.getByRole('button', { name: customLabel });
      expect(saveButton).toBeInTheDocument();
    });
  });
});
