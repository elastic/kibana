/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkUnmuteAlerts } from './bulk_unmute_alerts';

const http = httpServiceMock.createStartContract();

describe('bulkUnmuteAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call bulk unmute alerts API with correct parameters', async () => {
    const rules = [
      { rule_id: 'rule-1', alert_instance_ids: ['alert-1', 'alert-2'] },
      { rule_id: 'rule-2', alert_instance_ids: ['alert-3'] },
    ];

    await bulkUnmuteAlerts({ http, rules });

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/alerts/_bulk_unmute', {
      body: JSON.stringify({ rules }),
    });
  });

  test('should call bulk unmute alerts API with empty rules array', async () => {
    const rules: Array<{ rule_id: string; alert_instance_ids: string[] }> = [];

    await bulkUnmuteAlerts({ http, rules });

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/alerts/_bulk_unmute', {
      body: JSON.stringify({ rules }),
    });
  });
});
