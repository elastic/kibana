/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNewInstance } from './new_instance_status';
import { elasticsearchServiceMock, savedObjectsClientMock } from '../../../../core/server/mocks';

describe('isNewInstance', () => {
  it('returns true when there are no index patterns', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient();
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 100,
      total: 0,
      saved_objects: [],
    });
    expect(await isNewInstance({ esClient, soClient })).toEqual(true);
  });

  it.todo('returns false when there are any index patterns other than metrics-* or logs-*');
  it.todo('returns true if only no logs or metrics indices contain data');
  it.todo('returns true if only metrics-endpoint index contains data');
  it.todo('returns true if only metrics-elastic_agent index contains data');
  it.todo('returns true if only logs-elastic_agent index contains data');
  it.todo('returns true if only apm indices contain data');
  it.todo('returns false if any other logs or metrics indices contain data');
  it.todo('returns false if an authentication error is thrown');
});
