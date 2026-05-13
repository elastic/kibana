/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { HELLO_WORLD_LAB_ID, LABS_STORAGE_KEY } from '../../common';
import { createInstalledLabsService } from './installed_labs_service';

describe('InstalledLabsService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('loads installed labs from the user profile when available', async () => {
    const userProfile = userProfileServiceMock.createStart();
    userProfile.getEnabled$.mockReturnValue(of(true));
    userProfile.getCurrent.mockResolvedValue({
      data: {
        userSettings: {
          labsInstalledLabIdsJson: JSON.stringify([HELLO_WORLD_LAB_ID, 'unknown_lab']),
        },
      },
    } as never);

    const loadedService = createInstalledLabsService({
      allowedLabIds: [HELLO_WORLD_LAB_ID],
      userProfile,
    });

    await expect(loadedService.load()).resolves.toEqual([HELLO_WORLD_LAB_ID]);
  });

  it('falls back to localStorage when user profiles are disabled', async () => {
    localStorage.setItem(
      LABS_STORAGE_KEY,
      JSON.stringify({ installedLabIds: [HELLO_WORLD_LAB_ID], version: 1 })
    );

    const userProfile = userProfileServiceMock.createStart();
    userProfile.getEnabled$.mockReturnValue(of(false));

    const loadedService = createInstalledLabsService({
      allowedLabIds: [HELLO_WORLD_LAB_ID],
      userProfile,
    });

    await expect(loadedService.load()).resolves.toEqual([HELLO_WORLD_LAB_ID]);
  });

  it('writes installed lab ids to the user profile when available', async () => {
    const userProfile = userProfileServiceMock.createStart();
    userProfile.getEnabled$.mockReturnValue(of(true));
    userProfile.getCurrent.mockResolvedValue({ data: { userSettings: {} } } as never);

    const loadedService = createInstalledLabsService({
      allowedLabIds: [HELLO_WORLD_LAB_ID],
      userProfile,
    });

    await loadedService.setInstalled(HELLO_WORLD_LAB_ID, true);

    expect(userProfile.partialUpdate).toHaveBeenCalledWith({
      userSettings: {
        labsInstalledLabIdsJson: JSON.stringify([HELLO_WORLD_LAB_ID]),
      },
    });
  });

  it('uses localStorage as a migration source when the user profile field is empty', async () => {
    localStorage.setItem(
      LABS_STORAGE_KEY,
      JSON.stringify({ installedLabIds: [HELLO_WORLD_LAB_ID], version: 1 })
    );

    const userProfile = userProfileServiceMock.createStart();
    userProfile.getEnabled$.mockReturnValue(of(true));
    userProfile.getCurrent.mockResolvedValue({ data: { userSettings: {} } } as never);

    const loadedService = createInstalledLabsService({
      allowedLabIds: [HELLO_WORLD_LAB_ID],
      userProfile,
    });

    await expect(loadedService.load()).resolves.toEqual([HELLO_WORLD_LAB_ID]);
    expect(userProfile.partialUpdate).toHaveBeenCalledWith({
      userSettings: {
        labsInstalledLabIdsJson: JSON.stringify([HELLO_WORLD_LAB_ID]),
      },
    });
  });

  it('falls back to localStorage when user profile updates fail', async () => {
    const userProfile = userProfileServiceMock.createStart();
    userProfile.getEnabled$.mockReturnValue(of(true));
    userProfile.getCurrent.mockResolvedValue({ data: { userSettings: {} } } as never);
    userProfile.partialUpdate.mockRejectedValue(new Error('write failed'));

    const loadedService = createInstalledLabsService({
      allowedLabIds: [HELLO_WORLD_LAB_ID],
      userProfile,
    });

    await loadedService.setInstalled(HELLO_WORLD_LAB_ID, true);

    expect(JSON.parse(localStorage.getItem(LABS_STORAGE_KEY) ?? '{}')).toEqual({
      installedLabIds: [HELLO_WORLD_LAB_ID],
      version: 1,
    });
  });
});
