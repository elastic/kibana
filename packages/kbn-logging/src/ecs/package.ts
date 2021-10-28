/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-package.html
 *
 * @internal
 */
export interface EcsPackage {
  architecture?: string;
  build_version?: string;
  checksum?: string;
  description?: string;
  install_scope?: string;
  installed?: string;
  license?: string;
  name?: string;
  path?: string;
  reference?: string;
  size?: number;
  type?: string;
  version?: string;
}
