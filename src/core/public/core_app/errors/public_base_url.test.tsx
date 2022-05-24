/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { docLinksServiceMock } from '../../doc_links/doc_links_service.mock';
import { httpServiceMock } from '../../http/http_service.mock';
import { notificationServiceMock } from '../../notifications/notifications_service.mock';

import { setupPublicBaseUrlConfigWarning } from './public_base_url';

describe('publicBaseUrl warning', () => {
  const docLinks = docLinksServiceMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not show any toast on localhost', () => {
    const http = httpServiceMock.createStartContract();

    setupPublicBaseUrlConfigWarning({
      docLinks,
      notifications,
      http,
      location: {
        hostname: 'localhost',
      } as Location,
    });

    expect(notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  it('does not show any toast on 127.0.0.1', () => {
    const http = httpServiceMock.createStartContract();

    setupPublicBaseUrlConfigWarning({
      docLinks,
      notifications,
      http,
      location: {
        hostname: '127.0.0.1',
      } as Location,
    });

    expect(notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  it('does not show toast if configured correctly', () => {
    const http = httpServiceMock.createStartContract({ publicBaseUrl: 'http://myhost.com' });

    setupPublicBaseUrlConfigWarning({
      docLinks,
      notifications,
      http,
      location: {
        hostname: 'myhost.com',
        toString() {
          return 'http://myhost.com/';
        },
      } as Location,
    });

    expect(notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  describe('config missing toast', () => {
    it('adds toast if publicBaseUrl is missing', () => {
      const http = httpServiceMock.createStartContract({ publicBaseUrl: undefined });

      setupPublicBaseUrlConfigWarning({
        docLinks,
        notifications,
        http,
        location: {
          hostname: 'myhost.com',
          toString() {
            return 'http://myhost.com/';
          },
        } as Location,
      });

      expect(notifications.toasts.addWarning).toHaveBeenCalledWith({
        title: 'Configuration recommended',
        text: expect.any(Function),
      });
    });

    it('does not add toast if storage key set', () => {
      const http = httpServiceMock.createStartContract({ publicBaseUrl: undefined });

      setupPublicBaseUrlConfigWarning({
        docLinks,
        notifications,
        http,
        location: {
          hostname: 'myhost.com',
          toString() {
            return 'http://myhost.com/';
          },
        } as Location,
        storage: {
          getItem: (id: string) => 'true',
        } as Storage,
      });

      expect(notifications.toasts.addWarning).not.toHaveBeenCalled();
    });
  });
});
