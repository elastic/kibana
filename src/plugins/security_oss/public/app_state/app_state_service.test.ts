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
