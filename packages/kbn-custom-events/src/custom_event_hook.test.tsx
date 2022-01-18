/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Renderer, renderHook, RenderHookResult } from '@testing-library/react-hooks';

jest.mock('.', () => {
  return {
    customEvents: {
      setCustomEventContext: jest.fn(),
    },
  };
});
import { useCustomEventContext } from './custom_event_hook';
import { customEvents } from '.';

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCustomEventContext', () => {
    let hook: RenderHookResult<Record<string, number>, void, Renderer<Record<string, number>>>;

    function setupHook(context: Record<string, number>) {
      return renderHook<Record<string, number>, void>(
        (c) => {
          useCustomEventContext(c);
        },
        {
          initialProps: context,
        }
      );
    }

    it('doesnt change context if same object is passed', () => {
      hook = setupHook({ a: 1 });

      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ a: 1 });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledTimes(1);

      hook.rerender({ a: 1 });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledTimes(1);

      hook?.unmount();
      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ a: undefined });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledTimes(2);
    });

    it('changes context if different object is passed', () => {
      hook = setupHook({ a: 1 });

      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ a: 1 });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledTimes(1);

      hook.rerender({ b: 2 });

      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ a: undefined });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ b: 2 });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledTimes(3);

      hook.rerender({ a: 1 });

      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ b: undefined });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ a: 1 });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledTimes(5);

      hook?.unmount();
      expect(customEvents.setCustomEventContext).toHaveBeenCalledWith({ a: undefined });
      expect(customEvents.setCustomEventContext).toHaveBeenCalledTimes(6);
    });
  });
});
