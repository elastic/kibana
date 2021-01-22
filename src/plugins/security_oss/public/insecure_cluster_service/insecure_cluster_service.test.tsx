/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { nextTick } from '@kbn/test/jest';
import { coreMock } from '../../../../core/public/mocks';
import { mockAppStateService } from '../app_state/app_state_service.mock';
import type { ConfigType } from '../config';
import { InsecureClusterService } from './insecure_cluster_service';

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
  tenant?: string;
}

function initCore({ tenant = '/server-base-path' }: InitOpts = {}) {
  const coreSetup = coreMock.createSetup();
  (coreSetup.http.basePath.serverBasePath as string) = tenant;

  const coreStart = coreMock.createStart();
  coreStart.notifications.toasts.addWarning.mockReturnValue({ id: 'mock_alert_id' });
  return { coreSetup, coreStart };
}

describe('InsecureClusterService', () => {
  describe('display scenarios', () => {
    it('does not display an alert when the warning is explicitly disabled via config', async () => {
      const config: ConfigType = { showInsecureClusterWarning: false };
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).not.toHaveBeenCalled();
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not display an alert when state indicates that alert should not be shown', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: false } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('only reads storage information from the current tenant', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore({ tenant: '/my-specific-tenant' });

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue(JSON.stringify({ show: false }));

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart, appState });

      await nextTick();

      expect(storage.getItem).toHaveBeenCalledTimes(1);
      expect(storage.getItem).toHaveBeenCalledWith(
        'insecureClusterWarningVisibility/my-specific-tenant'
      );
    });

    it('does not display an alert when hidden via storage', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore();

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue(JSON.stringify({ show: false }));

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).not.toHaveBeenCalled();
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('displays an alert when persisted preference is corrupted', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore();

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue('{ this is a string of invalid JSON');

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('displays an alert when enabled via config and endpoint checks', async () => {
      const config: ConfigType = { showInsecureClusterWarning: true };
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).toHaveBeenCalledTimes(1);
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
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).toHaveBeenCalledTimes(1);
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
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      const { setAlertTitle, setAlertText } = service.setup({ core: coreSetup });
      setAlertTitle('some new title');
      setAlertText('some new alert text');

      service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).toHaveBeenCalledTimes(1);
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
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      const { hideAlert } = service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).toHaveBeenCalledTimes(1);
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
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      const appState = mockAppStateService.createStart();
      appState.getState.mockResolvedValue(
        mockAppStateService.createAppState({ insecureClusterAlert: { displayAlert: true } })
      );

      const service = new InsecureClusterService(config, storage);
      service.setup({ core: coreSetup });
      const { hideAlert } = service.start({ core: coreStart, appState });

      await nextTick();

      expect(appState.getState).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      hideAlert(false);

      expect(coreStart.notifications.toasts.remove).toHaveBeenCalledTimes(1);
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });
});
