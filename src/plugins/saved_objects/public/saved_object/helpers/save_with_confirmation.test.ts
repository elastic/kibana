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

import { SavedObjectAttributes, SavedObjectsCreateOptions, OverlayStart } from 'kibana/public';
import { SavedObjectsClientContract } from '../../../../../core/public';
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

  beforeEach(() => {
    savedObjectsClient.create = jest.fn();
    jest.spyOn(deps, 'confirmModalPromise').mockReturnValue(Promise.resolve({} as any));
  });

  test('should call create of savedObjectsClient', async () => {
    await saveWithConfirmation(source, savedObject, options, { savedObjectsClient, overlays });
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

    await saveWithConfirmation(source, savedObject, options, { savedObjectsClient, overlays });
    expect(deps.confirmModalPromise).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      overlays
    );
  });

  test('should call create of savedObjectsClient when overwriting confirmed', async () => {
    savedObjectsClient.create = jest
      .fn()
      .mockImplementation((type, src, opt) =>
        opt && opt.overwrite ? Promise.resolve({} as any) : Promise.reject({ res: { status: 409 } })
      );

    await saveWithConfirmation(source, savedObject, options, { savedObjectsClient, overlays });
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
      saveWithConfirmation(source, savedObject, options, {
        savedObjectsClient,
        overlays,
      })
    ).rejects.toThrow(OVERWRITE_REJECTED);
  });
});
