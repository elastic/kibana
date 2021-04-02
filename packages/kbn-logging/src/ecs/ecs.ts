/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @internal
 */
export interface EcsField {
  /**
   * These typings were written as of ECS 1.9.0.
   * Don't change this value without checking the rest
   * of the types to conform to that ECS version.
   *
   * https://www.elastic.co/guide/en/ecs/1.9/index.html
   */
  version: '1.9.0';
}
