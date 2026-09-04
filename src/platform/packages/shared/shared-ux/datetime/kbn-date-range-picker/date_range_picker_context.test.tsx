/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';

import type { DateRangePickerProps } from './date_range_picker';
import { DateRangePickerProvider, useDateRangePickerContext } from './date_range_picker_context';
import { DATE_RANGE_INPUT_DELIMITER } from './constants';

const INPUT_START = 'Jan 1, 2025, 00:00';
const INPUT_END = 'Mar 1, 2025, 00:00';
const INPUT_TEXT = `${INPUT_START} ${DATE_RANGE_INPUT_DELIMITER} ${INPUT_END}`;
const ISO_START = new Date(2025, 0, 1).toISOString();
const ISO_END = new Date(2025, 2, 1).toISOString();

interface SetupProps {
  defaultValue?: string;
  roundRelativeTime?: boolean;
}

const setup = ({ defaultValue = '-15m', roundRelativeTime = false }: SetupProps = {}) => {
  const onChange = jest.fn<void, Parameters<DateRangePickerProps['onChange']>>();
  const { result } = renderHook(() => useDateRangePickerContext(), {
    wrapper: ({ children }) => (
      <DateRangePickerProvider
        defaultValue={defaultValue}
        onChange={onChange}
        settings={{ roundRelativeTime }}
        onSettingsChange={() => {}}
      >
        {children}
      </DateRangePickerProvider>
    ),
  });
  return { result, onChange };
};

describe('DateRangePickerProvider', () => {
  describe('applyRange', () => {
    describe('with a textOverride and no range', () => {
      it('parses the override into ISO bounds instead of using the stale context text', () => {
        const { result, onChange } = setup({ defaultValue: '-15m' });

        act(() => result.current.applyRange(undefined, INPUT_TEXT));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ start: ISO_START, end: ISO_END, isInvalid: false })
        );
        expect(result.current.text).toBe(INPUT_TEXT);
      });

      it('reports an unparseable override as invalid', () => {
        const { result, onChange } = setup();

        act(() => result.current.applyRange(undefined, 'not a date'));

        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ isInvalid: true }));
      });
    });

    describe('with an explicit range', () => {
      it('preserves absolute bounds as-is and reflects them in the text', () => {
        const { result, onChange } = setup();
        const range = { start: '2025-01-01T00:00:00.000Z', end: '2025-03-01T00:00:00.000Z' };

        act(() => result.current.applyRange(range));

        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ start: range.start, end: range.end })
        );
        expect(result.current.text).toBe(
          `${range.start} ${DATE_RANGE_INPUT_DELIMITER} ${range.end}`
        );
      });

      it('runs datemath bounds through the parser instead of preserving them', () => {
        const { result, onChange } = setup({ roundRelativeTime: true });

        act(() => result.current.applyRange({ start: 'now-30m', end: 'now' }));

        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ start: 'now-30m/s', end: 'now' })
        );
      });
    });

    describe('with neither a range nor a textOverride', () => {
      it('falls back to the current context text', () => {
        const { result, onChange } = setup({ defaultValue: 'now-30m to now' });

        act(() => result.current.applyRange());

        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ start: 'now-30m', end: 'now' })
        );
      });
    });

    it('exits editing mode', () => {
      const { result } = setup();
      act(() => result.current.setIsEditing(true));
      expect(result.current.isEditing).toBe(true);

      act(() => result.current.applyRange());

      expect(result.current.isEditing).toBe(false);
    });
  });
});
