/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { docLinksServiceMock } from '../../doc_links/doc_links_service.mock';
import { httpServiceMock } from '../../http/http_service.mock';
import { notificationServiceMock } from '../../notifications/notifications_service.mock';

import { setupPublicBaseUrlConfigWarning } from './public_base_url';

describe('publicBaseUrl warning', () => {
  const docLinks = docLinksServiceMock.createSetupContract();
  const notifications = notificationServiceMock.createSetupContract();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not show any toast on localhost', () => {
    const http = httpServiceMock.createSetupContract();

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
    const http = httpServiceMock.createSetupContract();

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
    const http = httpServiceMock.createSetupContract({ publicBaseUrl: 'http://myhost.com' });

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
      const http = httpServiceMock.createSetupContract({ publicBaseUrl: undefined });

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
        title: 'Configuration missing',
        text: expect.any(Function),
      });
    });

    it('does not add toast if storage key set', () => {
      const http = httpServiceMock.createSetupContract({ publicBaseUrl: undefined });

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

  describe('config mismatch toast', () => {
    it('adds toast if location does not start with publicBaseUrl', () => {
      const http = httpServiceMock.createSetupContract({ publicBaseUrl: 'http://myhost.com:9999' });

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
        title: 'Configuration issue',
        text: expect.any(Function),
      });
    });

    it('does not add toast if storage key set', () => {
      const http = httpServiceMock.createSetupContract({ publicBaseUrl: 'http://myhost.com:9999' });

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
