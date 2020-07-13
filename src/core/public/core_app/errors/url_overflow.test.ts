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

import { createMemoryHistory, History } from 'history';

import { BasePath } from '../../http/base_path';
import { notificationServiceMock } from '../../notifications/notifications_service.mock';
import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';
import { IBasePath } from '../../http';
import { IToasts } from '../../notifications';
import { IUiSettingsClient } from '../../ui_settings';

import { setupUrlOverflowDetection, URL_MAX_LENGTH, URL_WARNING_LENGTH } from './url_overflow';

const longUrl = '/' + 'a'.repeat(URL_MAX_LENGTH);

describe('url overflow detection', () => {
  let basePath: IBasePath;
  let history: History;
  let toasts: jest.Mocked<IToasts>;
  let uiSettings: jest.Mocked<IUiSettingsClient>;
  let unlisten: any;

  beforeEach(() => {
    basePath = new BasePath('/test-123');
    history = createMemoryHistory();
    toasts = notificationServiceMock.createStartContract().toasts;
    uiSettings = uiSettingsServiceMock.createStartContract();

    Object.defineProperty(window, 'location', {
      value: {
        assign: jest.fn(),
      },
    });

    unlisten = setupUrlOverflowDetection({
      basePath,
      history,
      toasts,
      uiSettings,
    });
  });

  afterEach(() => {
    unlisten();
    jest.clearAllMocks();
  });

  it('redirects to error page when URL is too long', () => {
    history.push(longUrl);
    expect(window.location.assign).toHaveBeenCalledWith('/app/error?errorType=urlOverflow');
  });

  it('displays a toast if URL exceeds warning threshold', () => {
    const warningUrl = '/' + 'a'.repeat(URL_WARNING_LENGTH);
    history.push(warningUrl);
    expect(history.location.pathname).toEqual(warningUrl);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'The URL is big and Kibana might stop working',
        text: expect.any(Function),
      })
    );

    // Verify toast can be rendered correctly
    const { text: mountToast } = toasts.addWarning.mock.calls[0][0] as any;
    const element = document.createElement('div');
    const unmount = mountToast(element);
    expect(element).toMatchInlineSnapshot(`
      <div>
        Either enable the 
        <code>
          state:storeInSessionStorage
        </code>
         option in 
        <a
          href="/test-123/app/management/kibana/settings"
        >
          advanced settings
        </a>
         or simplify the onscreen visuals.
      </div>
    `);
    unmount();
  });

  it('does not redirect or show warning if URL is not too long', () => {
    history.push('/regular-length-url');
    expect(history.location.pathname).toEqual('/regular-length-url');
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(toasts.addWarning).not.toHaveBeenCalled();
  });

  it('does not redirect or show warning if state:storeInSessionStorage is set', () => {
    uiSettings.get.mockReturnValue(true);
    history.push(longUrl);
    expect(history.location.pathname).toEqual(longUrl);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(toasts.addWarning).not.toHaveBeenCalled();
  });

  it('does not redirect or show warning if already on the error page', () => {
    history.push('/app/error');
    const longQueryParam = 'a'.repeat(URL_MAX_LENGTH);
    const longErrorUrl = `/app/error?q=${longQueryParam}`;
    history.push(longErrorUrl);
    expect(history.location.pathname).toEqual('/app/error');
    expect(history.location.search).toEqual(`?q=${longQueryParam}`);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(toasts.addWarning).not.toHaveBeenCalled();
  });
});
