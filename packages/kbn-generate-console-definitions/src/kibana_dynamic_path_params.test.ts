/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDynamicPathComponents } from './kibana_dynamic_path_params';

describe('getDynamicPathComponents', () => {
  it('marks the curated path params with the kind of resource they hold', () => {
    expect(getDynamicPathComponents('api/spaces/space/{id}')).toStrictEqual({
      id: '__kibana_space',
    });
    expect(getDynamicPathComponents('api/actions/connector/{id}/_execute')).toStrictEqual({
      id: '__kibana_connector',
    });
    expect(getDynamicPathComponents('api/data_views/data_view/{viewId}/fields')).toStrictEqual({
      viewId: '__kibana_data_view',
    });
  });

  it('only marks the curated param of a pattern with several params', () => {
    expect(
      getDynamicPathComponents('api/alerting/rule/{rule_id}/alert/{alert_id}/_mute')
    ).toStrictEqual({ rule_id: '__kibana_rule' });
  });

  it('ignores other patterns', () => {
    expect(getDynamicPathComponents('api/features')).toStrictEqual({});
    expect(getDynamicPathComponents('api/saved_objects/{type}/{id}')).toStrictEqual({});
  });
});
