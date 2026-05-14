/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HELLO_WORLD_LAB_ID } from '../../common';
import { isLabInstalled } from './installed_labs';

describe('isLabInstalled', () => {
  it('returns true when user profiles are unavailable', async () => {
    await expect(isLabInstalled({} as never, HELLO_WORLD_LAB_ID)).resolves.toBe(true);
  });

  it('returns true when the lab is installed for the current user', async () => {
    const context = {
      userProfile: {
        getCurrent: jest.fn().mockResolvedValue({
          data: {
            userSettings: {
              labsInstalledLabIdsJson: JSON.stringify([HELLO_WORLD_LAB_ID]),
            },
          },
        }),
      },
    };

    await expect(isLabInstalled(context as never, HELLO_WORLD_LAB_ID)).resolves.toBe(true);
  });

  it('returns false when the lab is not installed for the current user', async () => {
    const context = {
      userProfile: {
        getCurrent: jest.fn().mockResolvedValue({
          data: {
            userSettings: {
              labsInstalledLabIdsJson: JSON.stringify([]),
            },
          },
        }),
      },
    };

    await expect(isLabInstalled(context as never, HELLO_WORLD_LAB_ID)).resolves.toBe(false);
  });
});
