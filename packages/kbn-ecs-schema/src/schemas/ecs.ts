/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable */
export const ecsEcs = {
  version: {
    dashed_name: 'ecs-version',
    description: 'ECS version this event conforms to. `ecs.version` is a required field and must exist in all events.\n' +
      'When querying across multiple indices -- which may conform to slightly different ECS versions -- this field lets integrations adjust to the schema version of the events.',
    example: '1.0.0',
    flat_name: 'ecs.version',
    ignore_above: 1024,
    level: 'core',
    name: 'version',
    normalize: [],
    required: true,
    short: 'ECS version this event conforms to.',
    type: 'keyword'
  }
}