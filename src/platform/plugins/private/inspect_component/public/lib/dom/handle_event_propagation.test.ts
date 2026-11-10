/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { handleEventPropagation } from './handle_event_propagation';
import { DEVELOPER_TOOLBAR_ID, INSPECT_OVERLAY_ID } from '../constants';

describe('handleEventPropagation', () => {
  let callbackMock: jest.Mock;
  let eventMock: MouseEvent;
  let targetElementMock: HTMLElement;

  beforeEach(() => {
    callbackMock = jest.fn();
    targetElementMock = {
      hasAttribute: jest.fn().mockReturnValue(false),
    } as unknown as HTMLElement;

    eventMock = {
      stopPropagation: jest.fn(),
      preventDefault: jest.fn(),
      target: targetElementMock,
      type: 'pointerdown',
    } as unknown as MouseEvent;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call stopPropagation and preventDefault on the event', () => {
    handleEventPropagation({ event: eventMock, callback: callbackMock });

    expect(eventMock.stopPropagation).toHaveBeenCalledTimes(1);
    expect(eventMock.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('should call callback when event type is click', () => {
    eventMock = {
      ...eventMock,
      type: 'click',
    } as unknown as MouseEvent;

    handleEventPropagation({ event: eventMock, callback: callbackMock });

    expect(callbackMock).toHaveBeenCalledTimes(1);
    expect(callbackMock).toHaveBeenCalledWith(eventMock);
  });

  it('should call callback when target element is disabled', () => {
    (targetElementMock.hasAttribute as jest.Mock).mockImplementation((attr: string) => {
      return attr === 'disabled';
    });

    handleEventPropagation({ event: eventMock, callback: callbackMock });

    expect(callbackMock).toHaveBeenCalledTimes(1);
    expect(callbackMock).toHaveBeenCalledWith(eventMock);
  });

  describe('developer toolbar', () => {
    const toolbar = document.createElement('div');
    toolbar.id = DEVELOPER_TOOLBAR_ID;

    beforeEach(() => {
      document.body.appendChild(toolbar);
    });

    afterEach(() => {
      toolbar.remove();
    });

    it('should leave events originating from the developer toolbar untouched', () => {
      const modeButton = document.createElement('button');
      toolbar.appendChild(modeButton);

      eventMock = { ...eventMock, target: modeButton, type: 'click' } as unknown as MouseEvent;

      handleEventPropagation({ event: eventMock, callback: callbackMock });

      expect(eventMock.stopPropagation).not.toHaveBeenCalled();
      expect(eventMock.preventDefault).not.toHaveBeenCalled();
      expect(callbackMock).not.toHaveBeenCalled();
    });

    it('should still handle clicks on the overlay, which is rendered by a toolbar item', () => {
      const overlay = document.createElement('div');
      overlay.id = INSPECT_OVERLAY_ID;
      const highlightBox = document.createElement('div');
      overlay.appendChild(highlightBox);
      toolbar.appendChild(overlay);

      eventMock = { ...eventMock, target: highlightBox, type: 'click' } as unknown as MouseEvent;

      handleEventPropagation({ event: eventMock, callback: callbackMock });

      expect(callbackMock).toHaveBeenCalledWith(eventMock);
    });
  });

  it.each(['pointerdown', 'mousedown', 'mouseup'])(
    'should stop but not cancel %s events originating from the overlay',
    (type) => {
      const overlay = document.createElement('div');
      overlay.id = INSPECT_OVERLAY_ID;
      const highlightBox = document.createElement('div');
      overlay.appendChild(highlightBox);

      eventMock = { ...eventMock, target: highlightBox, type } as unknown as MouseEvent;

      handleEventPropagation({ event: eventMock, callback: callbackMock });

      expect(eventMock.stopPropagation).toHaveBeenCalledTimes(1);
      expect(eventMock.preventDefault).not.toHaveBeenCalled();
      expect(callbackMock).not.toHaveBeenCalled();
    }
  );

  it('should not call callback when event is not click and element is not disabled', () => {
    eventMock = {
      ...eventMock,
      type: 'pointerdown',
    } as unknown as MouseEvent;

    handleEventPropagation({ event: eventMock, callback: callbackMock });

    expect(callbackMock).not.toHaveBeenCalled();
  });
});
