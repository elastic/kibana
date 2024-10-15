/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformAlertsIndexNamesResponse } from './transform_alerts_index_names_response';

describe('transformAlertsIndexNamesResponse', () => {
  it('changes the case of response keys', () => {
    expect(
      transformAlertsIndexNamesResponse({
        index_name: ['test'],
        has_read_index_privilege: true,
      })
    ).toEqual({
      indexName: ['test'],
      hasReadIndexPrivilege: true,
    });
  });
});
