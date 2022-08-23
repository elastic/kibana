/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsCodeSignature } from './code_signature';
import { EcsElf } from './elf';
import { EcsGroup } from './group';
import { EcsHash } from './hash';
import { EcsSource } from './source';
import { EcsUser } from './user';

interface NestedFields {
  code_signature?: EcsCodeSignature;
  elf?: EcsElf;
  entry_leader?: EcsProcess;
  group?: EcsGroup;
  group_leader?: EcsProcess;
  hash?: EcsHash;
  parent?: EcsProcess;
  previous?: EcsProcess;
  real_group?: EcsGroup;
  real_user?: EcsUser;
  saved_group?: EcsGroup;
  saved_user?: EcsUser;
  session_leader?: EcsProcess & { entry_meta?: EntryMeta };
  supplemental_groups?: EcsGroup;
  user?: EcsUser;
}

interface EntryMeta {
  type?: string;
  source?: EcsSource;
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
  env_vars?: Record<string, string>;
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
