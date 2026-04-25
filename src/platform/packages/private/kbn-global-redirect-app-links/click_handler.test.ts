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

    it('when href is empty string', () => {
      const link = document.createElement('a');
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when href starts with "#" (hash fragment)', () => {
      const link = document.createElement('a');
      link.href = '#section';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when URL constructor throws (invalid URL)', () => {
      const link = document.createElement('a');
      // Use an href that has invalid characters that would cause URL constructor to throw
      // Setting it to a string that will pass the string checks but fail URL parsing
      Object.defineProperty(link, 'href', {
        value: 'http://[invalid',
        writable: true,
      });
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when protocol is not http or https (ftp)', () => {
      const link = document.createElement('a');
      link.href = 'ftp://example.com/file.txt';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when protocol is not http or https (mailto)', () => {
      const link = document.createElement('a');
      link.href = 'mailto:user@example.com';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when protocol is not http or https (tel)', () => {
      const link = document.createElement('a');
      link.href = 'tel:+1234567890';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when origin is different (cross-origin)', () => {
      const link = document.createElement('a');
      link.href = 'http://other-domain.com/path';
      getClosestLink.mockReturnValue(link);

      clickHandler(event);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('when only hash changes on same document (path and search match)', () => {
      // Set up current location
      delete (window as any).location;
      (window as any).location = {
        href: 'http://example.com/path?query=1#old',
        origin: 'http://example.com',
        pathname: '/path',
        search: '?query=1',
        hash: '#old',
      };

      const link = document.createElement('a');
      link.href = 'http://example.com/path?query=1#new';
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

    it('when navigating to different path on same origin', () => {
      // Set up current location
      delete (window as any).location;
      (window as any).location = {
        href: 'http://example.com/current',
        origin: 'http://example.com',
        pathname: '/current',
        search: '',
        hash: '',
      };

      const link = document.createElement('a');
      link.href = 'http://example.com/new-path';
      getClosestLink.mockReturnValue(link);

      const preventDefault = jest.fn();
      const interceptedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(interceptedEvent, 'preventDefault', { value: preventDefault });

      clickHandler(interceptedEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('http://example.com/new-path');
    });

    it('when navigating to same path with different query params', () => {
      // Set up current location
      delete (window as any).location;
      (window as any).location = {
        href: 'http://example.com/path?old=1',
        origin: 'http://example.com',
        pathname: '/path',
        search: '?old=1',
        hash: '',
      };

      const link = document.createElement('a');
      link.href = 'http://example.com/path?new=2';
      getClosestLink.mockReturnValue(link);

      const preventDefault = jest.fn();
      const interceptedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(interceptedEvent, 'preventDefault', { value: preventDefault });

      clickHandler(interceptedEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('http://example.com/path?new=2');
    });

    it('when navigating with https protocol', () => {
      // Set up current location with https
      delete (window as any).location;
      (window as any).location = {
        href: 'https://example.com/current',
        origin: 'https://example.com',
        pathname: '/current',
        search: '',
        hash: '',
      };

      const link = document.createElement('a');
      link.href = 'https://example.com/new-path';
      getClosestLink.mockReturnValue(link);

      const preventDefault = jest.fn();
      const interceptedEvent = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(interceptedEvent, 'preventDefault', { value: preventDefault });

      clickHandler(interceptedEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('https://example.com/new-path');
    });
  });
});
