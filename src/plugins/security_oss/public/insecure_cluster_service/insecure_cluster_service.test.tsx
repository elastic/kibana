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
import { nextTick } from 'test_utils/enzyme_helpers';

let mockOnDismissCallback: () => void = jest.fn().mockImplementation(() => {
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
}

function initCoreStart({ displayAlert = true, isAnonymousPath = false }: InitOpts = {}) {
  const core = coreMock.createStart();
  core.http.get.mockImplementation(async (url: unknown) => {
    if (url === '/internal/security_oss/display_insecure_cluster_alert') {
      return { displayAlert };
    }
    throw new Error(`unexpected call to http.get: ${url}`);
  });
  core.http.anonymousPaths.isAnonymous.mockReturnValue(isAnonymousPath);

  core.notifications.toasts.addWarning.mockReturnValue({ id: 'mock_alert_id' });
  return core;
}

describe('InsecureClusterService', () => {
  describe('display scenarios', () => {
    it('does not display an alert when the warning is explicitly disabled via config', async () => {
      const config: ConfigType = { showInsecureClusterWarning: false };
      const core = initCoreStart({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.setup();
      service.start({ core });

      await nextTick();

      expect(core.http.get).not.toHaveBeenCalled();
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(core.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not display an alert when the endpoint check returns false', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const core = initCoreStart({ displayAlert: false });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.start({ core });

      await nextTick();

      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(core.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not display an alert when on an anonymous path', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const core = initCoreStart({ displayAlert: true, isAnonymousPath: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.start({ core });

      await nextTick();

      expect(core.http.get).not.toHaveBeenCalled();
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(core.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not display an alert when hidden via storage', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const core = initCoreStart({ displayAlert: true });

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue('hide');

      const service = new InsecureClusterService(config, storage);
      service.start({ core });

      await nextTick();

      expect(core.http.get).not.toHaveBeenCalled();
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(core.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('displays an alert when enabled via config and endpoint checks', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const core = initCoreStart({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.start({ core });

      await nextTick();

      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "text": "mocked default alert text",
          "title": "mocked default alert title",
        },
        Object {
          "toastLifeTimeMs": 864000000,
        },
      ]
    `);

      expect(core.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('dismisses the alert when requested, and remembers this preference', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const core = initCoreStart({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      service.start({ core });

      await nextTick();

      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      mockOnDismissCallback();

      expect(core.notifications.toasts.remove).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith('insecureClusterWarningVisibility', 'hide');
    });
  });

  describe('#setup', () => {
    it('allows the alert title and text to be replaced exactly once', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      const { setAlertTitle, setAlertText } = service.setup();
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
      const core = initCoreStart({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      const { setAlertTitle, setAlertText } = service.setup();
      setAlertTitle('some new title');
      setAlertText('some new alert text');

      service.start({ core });

      await nextTick();

      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "text": "some new alert text",
          "title": "some new title",
        },
        Object {
          "toastLifeTimeMs": 864000000,
        },
      ]
    `);

      expect(core.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('#start', () => {
    it('allows the alert to be hidden via start contract, and remembers this preference', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const core = initCoreStart({ displayAlert: true });
      const storage = coreMock.createStorage();

      const service = new InsecureClusterService(config, storage);
      const { hideAlert } = service.start({ core });

      await nextTick();

      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      hideAlert();

      expect(core.notifications.toasts.remove).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith('insecureClusterWarningVisibility', 'hide');
    });
  });
});
