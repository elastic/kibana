/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentMagementWrapper } from './content_management_wrapper';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { DataViewSavedObjectConflictError } from '../common';

describe('ContentMagementWrapper', () => {
  const cmClient = {} as ContentClient;

  test('get saved object - exactMatch', async () => {
    const mockedSavedObject = {
      version: 'abc',
    };
    cmClient.get = jest
      .fn()
      .mockResolvedValue({ meta: { outcome: 'exactMatch' }, item: mockedSavedObject });
    const service = new ContentMagementWrapper(cmClient);
    const result = await service.get('1');
    expect(result).toStrictEqual(mockedSavedObject);
  });

  test('get saved object - aliasMatch', async () => {
    const mockedSavedObject = {
      version: 'def',
    };
    cmClient.get = jest
      .fn()
      .mockResolvedValue({ meta: { outcome: 'aliasMatch' }, item: mockedSavedObject });
    const service = new ContentMagementWrapper(cmClient);
    const result = await service.get('1');
    expect(result).toStrictEqual(mockedSavedObject);
  });

  test('get saved object - conflict', async () => {
    const mockedSavedObject = {
      version: 'ghi',
    };

    cmClient.get = jest
      .fn()
      .mockResolvedValue({ meta: { outcome: 'conflict' }, item: mockedSavedObject });
    const service = new ContentMagementWrapper(cmClient);

    await expect(service.get('1')).rejects.toThrow(DataViewSavedObjectConflictError);
  });
});
