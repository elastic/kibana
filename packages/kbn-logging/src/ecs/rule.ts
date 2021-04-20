/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/1.9/ecs-rule.html
 *
 * @internal
 */
export interface EcsRule {
  author?: string[];
  category?: string;
  description?: string;
  id?: string;
  license?: string;
  name?: string;
  reference?: string;
  ruleset?: string;
  uuid?: string;
  version?: string;
}
