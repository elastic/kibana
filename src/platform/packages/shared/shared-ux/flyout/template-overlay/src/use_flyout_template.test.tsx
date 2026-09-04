/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { StrictMode, useRef } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { useFlyoutTemplate } from './use_flyout_template';

/** A stand-in for `SystemFlyoutRef`: `close()` is idempotent and resolves `onClose`. */
const createFlyoutRef = () => {
  let resolveClose: () => void;
  const onClose = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });
  let isClosed = false;

  return {
    onClose,
    isClosed: () => isClosed,
    close: jest.fn(() => {
      if (!isClosed) {
        isClosed = true;
        resolveClose();
      }
      return onClose;
    }),
  };
};

const createOverlays = () => {
  const refs: Array<ReturnType<typeof createFlyoutRef>> = [];
  const openFlyoutTemplate = jest.fn(() => {
    const ref = createFlyoutRef();
    refs.push(ref);
    return ref as unknown as OverlayRef;
  });

  return { overlays: { openFlyoutTemplate } as Pick<OverlayStart, 'openFlyoutTemplate'>, refs };
};

const zones = () => null;

describe('useFlyoutTemplate', () => {
  it('starts closed and reports isOpen once a flyout is opened', () => {
    const { overlays } = createOverlays();
    const { result } = renderHook(() => useFlyoutTemplate(overlays));

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open({ session: 'never' }, zones);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('forwards both arguments to openFlyoutTemplate and returns its ref', () => {
    const { overlays, refs } = createOverlays();
    const { result } = renderHook(() => useFlyoutTemplate(overlays));

    let returned: OverlayRef | undefined;
    act(() => {
      returned = result.current.open({ session: 'never', size: 'l' }, zones);
    });

    expect(overlays.openFlyoutTemplate).toHaveBeenCalledWith(
      { session: 'never', size: 'l' },
      zones
    );
    expect(returned).toBe(refs[0] as unknown as OverlayRef);
  });

  it('clears isOpen when the flyout closes through its own controls', async () => {
    const { overlays, refs } = createOverlays();
    const { result } = renderHook(() => useFlyoutTemplate(overlays));

    act(() => {
      result.current.open({ session: 'never' }, zones);
    });

    // The service closes the ref after running the consumer's `onClose`.
    await act(async () => {
      refs[0].close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('clears isOpen when closed through the hook', async () => {
    const { overlays, refs } = createOverlays();
    const { result } = renderHook(() => useFlyoutTemplate(overlays));

    act(() => {
      result.current.open({ session: 'never' }, zones);
    });

    await act(async () => {
      result.current.close();
    });

    expect(refs[0].close).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it('close() is a no-op when nothing is open', () => {
    const { overlays } = createOverlays();
    const { result } = renderHook(() => useFlyoutTemplate(overlays));

    expect(() => act(() => result.current.close())).not.toThrow();
    expect(overlays.openFlyoutTemplate).not.toHaveBeenCalled();
  });

  it('does not pass a wrapped onClose: the consumer keeps its own', () => {
    const { overlays } = createOverlays();
    const onClose = jest.fn();
    const { result } = renderHook(() => useFlyoutTemplate(overlays));

    act(() => {
      result.current.open({ session: 'never', onClose }, zones);
    });

    expect(overlays.openFlyoutTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ onClose }),
      zones
    );
  });

  it('closes the previous flyout when open is called again', () => {
    const { overlays, refs } = createOverlays();
    const { result } = renderHook(() => useFlyoutTemplate(overlays));

    act(() => {
      result.current.open({ session: 'never' }, zones);
    });
    act(() => {
      result.current.open({ session: 'never' }, zones);
    });

    expect(refs).toHaveLength(2);
    expect(refs[0].close).toHaveBeenCalled();
    expect(refs[1].close).not.toHaveBeenCalled();
  });

  it('closes an open flyout when the calling component unmounts', () => {
    const { overlays, refs } = createOverlays();
    const { result, unmount } = renderHook(() => useFlyoutTemplate(overlays));

    act(() => {
      result.current.open({ session: 'never' }, zones);
    });

    unmount();

    expect(refs[0].isClosed()).toBe(true);
  });

  it('returns focus to the trigger after the flyout closes', async () => {
    const { overlays, refs } = createOverlays();

    const Harness = () => {
      const triggerRef = useRef<HTMLButtonElement>(null);
      const flyout = useFlyoutTemplate(overlays, { returnFocusTo: triggerRef });
      return (
        <button
          type="button"
          ref={triggerRef}
          onClick={() => flyout.open({ session: 'never' }, zones)}
        >
          open
        </button>
      );
    };

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'open' });

    await userEvent.click(trigger);
    trigger.blur();
    expect(trigger).not.toHaveFocus();

    await act(async () => {
      refs[0].close();
    });

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  describe('when a close resolves after another flyout has taken its place', () => {
    /** A trigger button whose click opens a flyout, with focus set to return to it. */
    const TriggerHarness = ({
      overlays,
    }: {
      overlays: Pick<OverlayStart, 'openFlyoutTemplate'>;
    }) => {
      const triggerRef = useRef<HTMLButtonElement>(null);
      const flyout = useFlyoutTemplate(overlays, { returnFocusTo: triggerRef });
      return (
        <button
          type="button"
          ref={triggerRef}
          onClick={() => flyout.open({ session: 'never' }, zones)}
        >
          open
        </button>
      );
    };

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('keeps isOpen true after open() replaces a flyout that is already open', async () => {
      const { overlays } = createOverlays();
      const { result } = renderHook(() => useFlyoutTemplate(overlays));

      await act(async () => {
        result.current.open({ session: 'never' }, zones);
      });
      await act(async () => {
        result.current.open({ session: 'never' }, zones);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('leaves focus on the replacement flyout instead of returning it to the trigger', async () => {
      const { overlays } = createOverlays();
      render(<TriggerHarness overlays={overlays} />);
      const trigger = screen.getByRole('button', { name: 'open' });
      const focus = jest.spyOn(trigger, 'focus');

      await act(async () => {
        fireEvent.click(trigger);
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(focus).not.toHaveBeenCalled();
    });
  });

  it('clears isOpen after the mount effect has been torn down and re-run', async () => {
    const { overlays, refs } = createOverlays();
    // StrictMode mounts, tears down, then re-mounts the effect before the first commit.
    const { result } = renderHook(() => useFlyoutTemplate(overlays), { wrapper: StrictMode });

    act(() => {
      result.current.open({ session: 'never' }, zones);
    });
    await act(async () => {
      refs[refs.length - 1].close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('does not restore focus when the caller unmounts before the delay elapses', async () => {
    jest.useFakeTimers();
    const { overlays, refs } = createOverlays();

    const Harness = () => {
      const triggerRef = useRef<HTMLButtonElement>(null);
      const flyout = useFlyoutTemplate(overlays, { returnFocusTo: triggerRef });
      return (
        <button
          type="button"
          ref={triggerRef}
          onClick={() => flyout.open({ session: 'never' }, zones)}
        >
          open
        </button>
      );
    };

    const { unmount } = render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'open' });
    const focus = jest.spyOn(trigger, 'focus');

    await act(async () => {
      fireEvent.click(trigger);
    });
    await act(async () => {
      refs[0].close();
    });
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(focus).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
