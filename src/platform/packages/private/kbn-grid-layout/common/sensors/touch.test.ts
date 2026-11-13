/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserTouchEvent } from './touch';
import { startTouchInteraction } from './touch';

describe('startTouchInteraction', () => {
  const setup = () => {
    const target = document.createElement('div');
    const handlers = {
      onStart: jest.fn(),
      onMove: jest.fn(),
      onEnd: jest.fn(),
    };
    const e = { target, touches: [{ clientX: 0, clientY: 0 }] } as unknown as UserTouchEvent;
    return { target, handlers, e };
  };

  it('calls onEnd on touchend and removes all listeners', () => {
    const { target, handlers, e } = setup();
    startTouchInteraction({ e, ...handlers });
    target.dispatchEvent(new Event('touchmove'));
    target.dispatchEvent(new Event('touchend'));
    target.dispatchEvent(new Event('touchmove'));
    target.dispatchEvent(new Event('touchcancel'));

    expect(handlers.onStart).toHaveBeenCalledTimes(1);
    expect(handlers.onMove).toHaveBeenCalledTimes(1);
    expect(handlers.onEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onEnd on touchcancel and removes all listeners', () => {
    const { target, handlers, e } = setup();
    startTouchInteraction({ e, ...handlers });
    target.dispatchEvent(new Event('touchcancel'));
    target.dispatchEvent(new Event('touchmove'));
    target.dispatchEvent(new Event('touchend'));

    expect(handlers.onEnd).toHaveBeenCalledTimes(1);
    expect(handlers.onMove).not.toHaveBeenCalled();
  });
});
