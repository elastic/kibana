/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Meta-information specific to ECS.
 */
export interface EcsEcs {
  /**
   * ECS version this event conforms to. `ecs.version` is a required field and must exist in all events.
   * When querying across multiple indices -- which may conform to slightly different ECS versions -- this field lets integrations adjust to the schema version of the events.
   */
  version: '8.6.0';
}
