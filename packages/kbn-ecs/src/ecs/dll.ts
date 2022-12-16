/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsCodeSignature } from './code_signature';
import { EcsHash } from './hash';

interface NestedFields {
  code_signature?: EcsCodeSignature;
  hash?: EcsHash;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-dll.html
 *
 * @internal
 */
export interface EcsDll extends NestedFields {
  name?: string;
  path?: string;
}
