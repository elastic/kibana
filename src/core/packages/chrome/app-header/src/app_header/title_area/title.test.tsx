/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AppHeaderEditableTitle } from '../../types';
import { Title } from './title';

const editableTitle = (
  overrides: Partial<AppHeaderEditableTitle> = {}
): AppHeaderEditableTitle => ({
  text: 'My dashboard',
  onSave: jest.fn(),
  ...overrides,
});

const enterEditMode = (name = 'My dashboard') => {
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.getByRole('textbox');
};

const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });

describe('Title', () => {
  describe('rendering', () => {
    it('renders a non-editable string title as a heading with no edit button', () => {
      render(<Title title="Static title" />);

      expect(screen.getByRole('heading', { name: 'Static title' })).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders an editable title as a button with screen-reader edit instructions', () => {
      render(<Title title={editableTitle()} />);

      expect(screen.getByRole('button', { name: 'My dashboard' })).toBeInTheDocument();
      expect(screen.getByText('Editable title. Press Enter to edit.')).toBeInTheDocument();
    });

    it('renders the placeholder when an editable title is empty', () => {
      render(<Title title={editableTitle({ text: '', placeholder: 'Untitled dashboard' })} />);

      expect(screen.getByRole('button', { name: 'Untitled dashboard' })).toBeInTheDocument();
    });
  });

  describe('entering edit mode', () => {
    it('opens an input pre-filled with the current text and a custom aria-label', () => {
      render(<Title title={editableTitle({ ariaLabel: 'Edit dashboard name' })} />);

      const input = enterEditMode();

      expect(input).toHaveValue('My dashboard');
      expect(input).toHaveAttribute('aria-label', 'Edit dashboard name');
    });

    it('falls back to a generic aria-label when none is provided', () => {
      render(<Title title={editableTitle()} />);

      expect(enterEditMode()).toHaveAttribute('aria-label', 'Edit title');
    });
  });

  describe('saving', () => {
    it('trims the value and calls onSave once, then exits edit mode', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, '  New title  ');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(onSave).toHaveBeenCalledWith('New title'));
      expect(onSave).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    });

    it('does not call onSave when the value is unchanged but still exits edit mode', async () => {
      const onSave = jest.fn();
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, '  My dashboard  ');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
      expect(onSave).not.toHaveBeenCalled();
    });

    it('commits via onSave when the input is blurred (click away)', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, 'Blurred title');
      fireEvent.blur(input);

      await waitFor(() => expect(onSave).toHaveBeenCalledWith('Blurred title'));
    });

    it('keeps the input disabled and busy while saving, then exits when resolved', async () => {
      let resolveSave: () => void;
      const onSave = jest.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
      );
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, 'Renamed');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(screen.getByRole('textbox')).toBeDisabled());
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-busy', 'true');

      // A blur arriving mid-save must not trigger a second onSave.
      fireEvent.blur(screen.getByRole('textbox'));

      await act(async () => {
        resolveSave!();
      });

      await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation and errors', () => {
    it('shows the empty-title error and does not call onSave', async () => {
      const onSave = jest.fn();
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, '');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(await screen.findByRole('alert')).toHaveTextContent('Title cannot be empty.');
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('surfaces an error string returned by onSave and keeps the editor open', async () => {
      const onSave = jest.fn().mockResolvedValue('Name already taken');
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, 'Duplicate');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(await screen.findByRole('alert')).toHaveTextContent('Name already taken');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('surfaces a generic error when onSave rejects and keeps the editor open', async () => {
      const onSave = jest.fn().mockRejectedValue(new Error('boom'));
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, 'Will fail');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid title.');
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('cancelling', () => {
    it('discards the draft on Escape without calling onSave', async () => {
      const onSave = jest.fn();
      render(<Title title={editableTitle({ onSave })} />);

      const input = enterEditMode();
      type(input, 'Discarded edit');
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
      expect(onSave).not.toHaveBeenCalled();
      expect(enterEditMode()).toHaveValue('My dashboard');
    });
  });
});
