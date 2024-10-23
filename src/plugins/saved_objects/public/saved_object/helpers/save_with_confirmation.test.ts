/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectAttributes, SavedObjectsCreateOptions, OverlayStart } from '@kbn/core/public';
import { SavedObjectsClientContract } from '@kbn/core/public';
import { analyticsServiceMock, i18nServiceMock, themeServiceMock } from '@kbn/core/public/mocks';
import { saveWithConfirmation } from './save_with_confirmation';
import * as deps from './confirm_modal_promise';
import { OVERWRITE_REJECTED } from '../../constants';

describe('saveWithConfirmation', () => {
  const savedObjectsClient: SavedObjectsClientContract = {} as SavedObjectsClientContract;
  const overlays: OverlayStart = {} as OverlayStart;
  const source: SavedObjectAttributes = {} as SavedObjectAttributes;
  const options: SavedObjectsCreateOptions = {} as SavedObjectsCreateOptions;
  const savedObject = {
    getEsType: () => 'test type',
    title: 'test title',
    displayName: 'test display name',
  };
  const startServices = {
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    i18n: i18nServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
  };

  beforeEach(() => {
    savedObjectsClient.create = jest.fn();
    jest.spyOn(deps, 'confirmModalPromise').mockReturnValue(Promise.resolve({} as any));
  });

  test('should call create of savedObjectsClient', async () => {
    await saveWithConfirmation(
      source,
      savedObject,
      options,
      { savedObjectsClient, overlays },
      startServices
    );
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      savedObject.getEsType(),
      source,
      options
    );
  });

  test('should call confirmModalPromise when such record exists', async () => {
    savedObjectsClient.create = jest
      .fn()
      .mockImplementation((type, src, opt) =>
        opt && opt.overwrite ? Promise.resolve({} as any) : Promise.reject({ res: { status: 409 } })
      );

    await saveWithConfirmation(
      source,
      savedObject,
      options,
      { savedObjectsClient, overlays },
      startServices
    );
    expect(deps.confirmModalPromise).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      overlays,
      expect.objectContaining({
        analytics: expect.any(Object),
        i18n: expect.any(Object),
        theme: expect.any(Object),
      })
    );
  });

  test('should call create of savedObjectsClient when overwriting confirmed', async () => {
    savedObjectsClient.create = jest
      .fn()
      .mockImplementation((type, src, opt) =>
        opt && opt.overwrite ? Promise.resolve({} as any) : Promise.reject({ res: { status: 409 } })
      );

    await saveWithConfirmation(
      source,
      savedObject,
      options,
      { savedObjectsClient, overlays },
      startServices
    );
    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(savedObject.getEsType(), source, {
      overwrite: true,
      ...options,
    });
  });

  test('should reject when overwriting denied', async () => {
    savedObjectsClient.create = jest.fn().mockReturnValue(Promise.reject({ res: { status: 409 } }));
    jest.spyOn(deps, 'confirmModalPromise').mockReturnValue(Promise.reject());

    expect.assertions(1);
    await expect(
      saveWithConfirmation(
        source,
        savedObject,
        options,
        {
          savedObjectsClient,
          overlays,
        },
        startServices
      )
    ).rejects.toThrow(OVERWRITE_REJECTED);
  });
});
