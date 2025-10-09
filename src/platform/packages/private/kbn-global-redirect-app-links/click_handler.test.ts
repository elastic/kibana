/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createClickHandler } from './click_handler';

jest.mock('@kbn/shared-ux-utility', () => ({
  getClosestLink: jest.fn(),
}));

const { getClosestLink } = jest.requireMock('@kbn/shared-ux-utility');

describe('createClickHandler', () => {
  let navigateToUrl: jest.Mock;
  let clickHandler: (event: MouseEvent) => void;
  let event: MouseEvent;

  beforeEach(() => {
    navigateToUrl = jest.fn();
    clickHandler = createClickHandler(navigateToUrl);
    event = new MouseEvent('click', { button: 0 });
    jest.clearAllMocks();
  });

  describe('should ignore clicks', () => {
    it('when not a left-click (button !== 0)', () => {
      const rightClickEvent = new MouseEvent('click', { button: 2 });
      const link = document.createElement('a');
      link.href = 'http://example.com';
      getClosestLink.mockReturnValue(link);

      clickHandler(rightClickEvent);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when no link is found', () => {
      getClosestLink.mockReturnValue(null);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when event.defaultPrevented is true', () => {
      const preventedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      preventedEvent.preventDefault();
      const link = document.createElement('a');
      link.href = 'http://example.com';
      getClosestLink.mockReturnValue(link);

      clickHandler(preventedEvent);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when link has data-kbn-redirect-app-link-ignore attribute', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com';
      link.setAttribute('data-kbn-redirect-app-link-ignore', '');
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when metaKey is pressed', () => {
      const metaKeyEvent = new MouseEvent('click', { button: 0, metaKey: true });
      const link = document.createElement('a');
      link.href = 'http://example.com';
      getClosestLink.mockReturnValue(link);

      clickHandler(metaKeyEvent);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when altKey is pressed', () => {
      const altKeyEvent = new MouseEvent('click', { button: 0, altKey: true });
      const link = document.createElement('a');
      link.href = 'http://example.com';
      getClosestLink.mockReturnValue(link);

      clickHandler(altKeyEvent);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when ctrlKey is pressed', () => {
      const ctrlKeyEvent = new MouseEvent('click', { button: 0, ctrlKey: true });
      const link = document.createElement('a');
      link.href = 'http://example.com';
      getClosestLink.mockReturnValue(link);

      clickHandler(ctrlKeyEvent);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when shiftKey is pressed', () => {
      const shiftKeyEvent = new MouseEvent('click', { button: 0, shiftKey: true });
      const link = document.createElement('a');
      link.href = 'http://example.com';
      getClosestLink.mockReturnValue(link);

      clickHandler(shiftKeyEvent);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when link has target="_blank"', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com';
      link.target = '_blank';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when link has target="_parent"', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com';
      link.target = '_parent';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when link has download attribute', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com/file.pdf';
      link.setAttribute('download', '');
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when link has rel="external"', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com';
      link.rel = 'external';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when link has rel="noopener external"', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com';
      link.rel = 'noopener external';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });
  });

  describe('should intercept clicks', () => {
    it('when all conditions are met', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com/path';
      getClosestLink.mockReturnValue(link);

      const preventDefault = jest.fn();
      const interceptedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(interceptedEvent, 'preventDefault', { value: preventDefault });

      clickHandler(interceptedEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('http://example.com/path');
    });

    it('when link has no target attribute', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com/path';
      getClosestLink.mockReturnValue(link);

      const preventDefault = jest.fn();
      const interceptedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(interceptedEvent, 'preventDefault', { value: preventDefault });

      clickHandler(interceptedEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('http://example.com/path');
    });

    it('when link has target="_self"', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com/path';
      link.target = '_self';
      getClosestLink.mockReturnValue(link);

      const preventDefault = jest.fn();
      const interceptedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(interceptedEvent, 'preventDefault', { value: preventDefault });

      clickHandler(interceptedEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('http://example.com/path');
    });

    it('when link has rel="noopener" (but not external)', () => {
      const link = document.createElement('a');
      link.href = 'http://example.com/path';
      link.rel = 'noopener';
      getClosestLink.mockReturnValue(link);

      const preventDefault = jest.fn();
      const interceptedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(interceptedEvent, 'preventDefault', { value: preventDefault });

      clickHandler(interceptedEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('http://example.com/path');
    });
  });
});
