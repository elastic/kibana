/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsCodeSignature } from './code_signature';
import { EcsElf } from './elf';
import { EcsHash } from './hash';
import { EcsPe } from './pe';

interface NestedFields {
  code_signature?: EcsCodeSignature;
  elf?: EcsElf;
  hash?: EcsHash;
  parent?: EcsProcess;
  pe?: EcsPe;
  target?: EcsProcess;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-process.html
 *
 * @internal
 */
export interface EcsProcess extends NestedFields {
  args?: string[];
  args_count?: number;
  command_line?: string;
  end?: string;
  entity_id?: string;
  executable?: string;
  exit_code?: number;
  name?: string;
  pgid?: number;
  pid?: number;
  start?: string;
  title?: string;
  uptime?: number;
  working_directory?: string;
}
