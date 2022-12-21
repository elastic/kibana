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
import { EcsX509 } from './x509';

interface NestedFields {
  code_signature?: EcsCodeSignature;
  elf?: EcsElf;
  hash?: EcsHash;
  x509?: EcsX509;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-file.html
 *
 * @internal
 */
export interface EcsFile extends NestedFields {
  accessed?: string;
  attributes?: string[];
  created?: string;
  ctime?: string;
  device?: string;
  directory?: string;
  drive_letter?: string;
  extension?: string;
  fork_name?: string;
  gid?: string;
  group?: string;
  inode?: string;
  // Technically this is a known list, but it's massive, so we'll just accept a string for now :)
  // https://www.iana.org/assignments/media-types/media-types.xhtml
  mime_type?: string;
  mode?: string;
  mtime?: string;
  name?: string;
  owner?: string;
  path?: string;
  'path.text'?: string;
  size?: number;
  target_path?: string;
  'target_path.text'?: string;
  type?: string;
  uid?: string;
}
