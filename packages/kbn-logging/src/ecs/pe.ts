/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-pe.html
 *
 * @internal
 */
export interface EcsPe {
  architecture?: string;
  company?: string;
  description?: string;
  file_version?: string;
  imphash?: string;
  original_file_name?: string;
  pehash?: string;
  product?: string;
}
