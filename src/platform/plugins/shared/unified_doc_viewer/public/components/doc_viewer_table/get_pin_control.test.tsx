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
import type { FieldRow } from './field_row';
import { getPinColumnControl } from './get_pin_control';
import { buildFieldRowMock } from './field_row.mocks';
import { userEvent } from '@testing-library/user-event';

const rows: FieldRow[] = [
  buildFieldRowMock({
    name: 'message',
  }),
];

const setup = () => {
  const user = userEvent.setup();

  const onTogglePinned = jest.fn();
  const requestFocus = jest.fn();
  const control = getPinColumnControl({ onTogglePinned });
  render(
    <>
      {control.renderCell({
        row: rows[0],
        rowId: rows[0].name,
        columnId: control.id,
        requestFocus,
      })}
    </>
  );

  return { user, onTogglePinned, requestFocus };
};

describe('getPinControl', () => {
  describe('when the pin is clicked', () => {
    it('toggles the field without requesting focus for pointer activation', async () => {
      const { onTogglePinned, requestFocus, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Pin field' }));

      expect(onTogglePinned).toHaveBeenCalledWith('message');
      expect(requestFocus).not.toHaveBeenCalled();
    });
  });

  describe('when the pin is focused', () => {
    describe('and Enter is pressed', () => {
      it('toggles the field and requests focus by stable cell identity', async () => {
        const { onTogglePinned, requestFocus, user } = setup();

        const button = screen.getByRole('button', { name: 'Pin field' });
        button.focus();
        await user.keyboard('{enter}');

        expect(onTogglePinned).toHaveBeenCalledWith('message');
        expect(requestFocus).toHaveBeenCalledWith({
          rowId: 'message',
          columnId: 'pin_field',
        });
      });
    });

    describe('and Enter is not pressed', () => {
      it('should not call onTogglePinned', async () => {
        const { onTogglePinned, user } = setup();

        const button = screen.getByRole('button', { name: 'Pin field' });
        button.focus();
        await user.keyboard('A');

        expect(onTogglePinned).not.toHaveBeenCalled();
      });
    });
  });
});
