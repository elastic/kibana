/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-orchestrator.html
 *
 * @internal
 */
export interface EcsOrchestrator {
  api_version?: string;
  cluster?: Cluster;
  namespace?: string;
  organization?: string;
  resource?: Resource;
  type?: string;
}

interface Cluster {
  name?: string;
  url?: string;
  version?: string;
}

interface Resource {
  name?: string;
  type?: string;
}
