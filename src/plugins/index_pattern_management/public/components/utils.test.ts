/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getIndexPatterns } from './utils';
import { coreMock } from '../../../../core/public/mocks';
import { mockManagementPlugin } from '../mocks';
import { HttpFetchOptions } from 'kibana/public';

const { http, savedObjects } = coreMock.createStart();
const mockManagementPluginStart = mockManagementPlugin.createStartContract();

(savedObjects.client.find as jest.Mock).mockResolvedValue({
  savedObjects: [
    {
      id: 'test',
      attributes: {
        patternList: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        title: 'Label',
      },
      get: () => {
        return ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'];
      },
    },
    {
      id: 'test1',
      get: () => {
        return ['test name 1'];
      },
    },
  ],
});

describe('getting index patterns', () => {
  beforeEach(() => {
    // @ts-ignore
    jest.spyOn(http, 'fetch').mockImplementation((path: string, options: HttpFetchOptions) =>
      // @ts-ignore
      Promise.resolve(JSON.parse(options.body).patternList)
    );
  });
  test('it gets', async () => {
    const indexPatterns = await getIndexPatterns(
      savedObjects.client,
      'test',
      mockManagementPluginStart,
      http
    );
    expect(indexPatterns).toMatchSnapshot();
  });
});
