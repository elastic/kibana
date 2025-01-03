/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient } from '..';

const buildkite = new BuildkiteClient();

export const pingTeam = async () => {
  if (process.env.ELASTIC_SLACK_NOTIFICATIONS_ENABLED === 'true') {
    const team = process.env.PING_SLACK_TEAM;
    if (team) {
      buildkite.setMetadata(
        'slack:ping_team:body',
        `${team}, can you please take a look at the test failures?`
      );
    }
  }
};
