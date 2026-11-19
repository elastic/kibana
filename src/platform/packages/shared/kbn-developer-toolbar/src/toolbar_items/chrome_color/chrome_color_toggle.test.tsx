/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { LiveChromeColorToggle } from './chrome_color_toggle';

const setup = ({ darkMode, userSettings }: { darkMode: boolean; userSettings?: object }) => {
  const theme$ = new BehaviorSubject({ darkMode });
  const theme = { theme$: theme$.asObservable(), getTheme: () => theme$.getValue() };
  const profile$ = new BehaviorSubject<object | null>({ userSettings });
  const partialUpdate = jest.fn().mockResolvedValue(undefined);
  const userProfile = {
    getUserProfile$: () => profile$.asObservable(),
    partialUpdate,
  } as unknown as UserProfileService;
  const onError = jest.fn();

  render(<LiveChromeColorToggle theme={theme} userProfile={userProfile} onError={onError} />);
  return { partialUpdate, onError, theme$ };
};

const openPopover = async () => {
  fireEvent.click(screen.getByTestId('developerToolbarChromeColor'));
  return screen.findByTestId('euiColorPickerInput_top');
};

describe('LiveChromeColorToggle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('only writes the override for the current light mode', async () => {
    const { partialUpdate } = setup({ darkMode: false });
    const picker = await openPopover();

    fireEvent.change(picker, { target: { value: '#0B64DD' } });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(partialUpdate).toHaveBeenCalledTimes(1);
    expect(partialUpdate).toHaveBeenCalledWith({ userSettings: { chromeColorLight: '#0B64DD' } });
  });

  it('only writes the override for the current dark mode', async () => {
    const { partialUpdate } = setup({ darkMode: true });
    const picker = await openPopover();

    fireEvent.change(picker, { target: { value: '#F04E98' } });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(partialUpdate).toHaveBeenCalledWith({ userSettings: { chromeColorDark: '#F04E98' } });
  });

  it('debounces rapid changes into one update and ignores partial hex values', async () => {
    const { partialUpdate } = setup({ darkMode: false });
    const picker = await openPopover();

    fireEvent.change(picker, { target: { value: '#0B6' } });
    fireEvent.change(picker, { target: { value: '#0B64D' } });
    fireEvent.change(picker, { target: { value: '#0B64DD' } });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(partialUpdate).toHaveBeenCalledTimes(1);
    expect(partialUpdate).toHaveBeenCalledWith({ userSettings: { chromeColorLight: '#0B64DD' } });
  });

  it('clears the override for the current mode on reset', async () => {
    const { partialUpdate } = setup({
      darkMode: true,
      userSettings: { chromeColorDark: '#112233', chromeColorLight: '#EEEEEE' },
    });
    await openPopover();

    fireEvent.click(screen.getByTestId('developerToolbarChromeColorReset'));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(partialUpdate).toHaveBeenCalledWith({ userSettings: { chromeColorDark: '' } });
  });

  it('reports a failed update', async () => {
    const error = new Error('nope');
    const { partialUpdate, onError } = setup({ darkMode: false });
    partialUpdate.mockRejectedValue(error);
    const picker = await openPopover();

    fireEvent.change(picker, { target: { value: '#0B64DD' } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(onError).toHaveBeenCalledWith(error);
  });
});
