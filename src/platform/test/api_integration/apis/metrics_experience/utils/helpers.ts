/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type SuperTest from 'supertest';

export const toggleMetricsExperienceFeature = async (
  supertest: SuperTest.Agent,
  value: boolean
) => {
  const response = await supertest
    .put('/internal/core/_settings')
    .set('elastic-api-version', '1')
    .set('kbn-xsrf', 'some-xsrf-token')
    .set('x-elastic-internal-origin', 'kibana')
    .send({
      'feature_flags.overrides': {
        metricsExperienceEnabled: value,
      },
    })
    .expect(200, { ok: true });

  return response.body;
};
