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

import { InsecureClusterService } from './insecure_cluster_service';
import { ConfigType } from '../config';
import { coreMock } from '../../../../core/public/mocks';
import { nextTick } from '@kbn/test/jest';

let mockOnDismissCallback: (persist: boolean) => void = jest.fn().mockImplementation(() => {
  throw new Error('expected callback to be replaced!');
});

jest.mock('./components', () => {
  return {
    defaultAlertTitle: 'mocked default alert title',
    defaultAlertText: (onDismiss: any) => {
      mockOnDismissCallback = onDismiss;
      return 'mocked default alert text';
    },
  };
});

interface InitOpts {
  displayAlert?: boolean;
  isAnonymousPath?: boolean;
  tenant?: string;
}

function initCore({
  displayAlert = true,
  isAnonymousPath = false,
  tenant = '/server-base-path',
}: InitOpts = {}) {
  const coreSetup = coreMock.createSetup();
  (coreSetup.http.basePath.serverBasePath as string) = tenant;

  const coreStart = coreMock.createStart();
  coreStart.http.get.mockImplementation(async (url: unknown) => {
    if (url === '/internal/security_oss/display_insecure_cluster_alert') {
      return { displayAlert };
    }
    throw new Error(`unexpected call to http.get: ${url}`);
  });
  coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(isAnonymousPath);

  coreStart.notifications.toasts.addWarning.mockReturnValue({ id: 'mock_alert_id' });
  return { coreSetup, coreStart };
}

describe('InsecureClusterService', () => {
  describe('display scenarios', () => {
    it('does not display an alert when the warning is explicitly disabled via config', async () => {
      const config: ConfigType = { showInsecureClusterWarning: false };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).not.toHaveBeenCalled();
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not display an alert when the endpoint check returns false', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: false });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not display an alert when on an anonymous path', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true, isAnonymousPath: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).not.toHaveBeenCalled();
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('only reads storage information from the current tenant', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({
        displayAlert: true,
        tenant: '/my-specific-tenant',
      });

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue(JSON.stringify({ show: false }));

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(storage.getItem).toHaveBeenCalledTimes(1);
      expect(storage.getItem).toHaveBeenCalledWith(
        'insecureClusterWarningVisibility/my-specific-tenant'
      );
    });

    it('does not display an alert when hidden via storage', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue(JSON.stringify({ show: false }));

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).not.toHaveBeenCalled();
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('displays an alert when persisted preference is corrupted', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue('{ this is a string of invalid JSON');

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('displays an alert when enabled via config and endpoint checks', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "iconType": "alert",
            "text": "mocked default alert text",
            "title": "mocked default alert title",
          },
          Object {
            "toastLifeTimeMs": 864000000,
          },
        ]
      `);

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('dismisses the alert when requested, and remembers this preference', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      mockOnDismissCallback(true);

      expect(coreStart.notifications.toasts.remove).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith(
        'insecureClusterWarningVisibility/server-base-path',
        JSON.stringify({ show: false })
      );
    });
  });

  describe('#setup', () => {
    it('allows the alert title and text to be replaced exactly once', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const storage = coreMock.createStorage();

      const { coreSetup } = initCore();

      const service = new InsecureClusterService(config, storage);
      const { setAlertTitle, setAlertText } = service.setup({ core: coreSetup });
      setAlertTitle('some new title');
      setAlertText('some new alert text');

      expect(() => setAlertTitle('')).toThrowErrorMatchingInlineSnapshot(
        `"alert title has already been set"`
      );
      expect(() => setAlertText('')).toThrowErrorMatchingInlineSnapshot(
        `"alert text has already been set"`
      );
    });

    it('allows the alert title and text to be replaced', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      const { setAlertTitle, setAlertText } = service.setup({ core: coreSetup });
      setAlertTitle('some new title');
      setAlertText('some new alert text');

      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "iconType": "alert",
            "text": "some new alert text",
            "title": "some new title",
          },
          Object {
            "toastLifeTimeMs": 864000000,
          },
        ]
      `);

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('#start', () => {
    it('allows the alert to be hidden via start contract, and remembers this preference', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      const { hideAlert } = service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      hideAlert(true);

      expect(coreStart.notifications.toasts.remove).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith(
        'insecureClusterWarningVisibility/server-base-path',
        JSON.stringify({ show: false })
      );
    });

    it('allows the alert to be hidden via start contract, and does not remember the preference', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      const { hideAlert } = service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      hideAlert(false);

      expect(coreStart.notifications.toasts.remove).toHaveBeenCalledTimes(1);
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });
});
