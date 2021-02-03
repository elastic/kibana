/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { coreMock } from '../../../../core/public/mocks';
import { AppStateService } from './app_state_service';

describe('AppStateService', () => {
  describe('#start', () => {
    it('returns default state for the anonymous routes', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);

      const appStateService = new AppStateService();
      await expect(appStateService.start({ core: coreStart }).getState()).resolves.toEqual({
        insecureClusterAlert: { displayAlert: false },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });

      expect(coreStart.http.get).not.toHaveBeenCalled();
    });

    it('returns default state if current state cannot be retrieved', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(false);

      const failureReason = new Error('Uh oh.');
      coreStart.http.get.mockRejectedValue(failureReason);

      const appStateService = new AppStateService();
      await expect(appStateService.start({ core: coreStart }).getState()).resolves.toEqual({
        insecureClusterAlert: { displayAlert: false },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security_oss/app_state');
    });

    it('returns retrieved state', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(false);

      const state = {
        insecureClusterAlert: { displayAlert: true },
        anonymousAccess: { isEnabled: true, accessURLParameters: { hint: 'some-hint' } },
      };
      coreStart.http.get.mockResolvedValue(state);

      const appStateService = new AppStateService();
      await expect(appStateService.start({ core: coreStart }).getState()).resolves.toEqual(state);

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security_oss/app_state');
    });
  });
});
