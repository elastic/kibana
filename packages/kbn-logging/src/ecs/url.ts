/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-url.html
 *
 * @internal
 */
export interface EcsUrl {
  domain?: string;
  extension?: string;
  fragment?: string;
  full?: string;
  original?: string;
  password?: string;
  path?: string;
  port?: number;
  query?: string;
  registered_domain?: string;
  scheme?: string;
  subdomain?: string;
  top_level_domain?: string;
  username?: string;
}
