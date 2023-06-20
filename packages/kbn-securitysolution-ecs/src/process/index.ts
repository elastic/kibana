/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CodeSignature, Ext } from '../file';

export interface ProcessEcs {
  Ext?: Ext;
  command_line?: string[];
  entity_id?: string[];
  entry_leader?: ProcessSessionData;
  session_leader?: ProcessSessionData;
  group_leader?: ProcessSessionData;
  exit_code?: number[];
  hash?: ProcessHashData;
  parent?: ProcessParentData;
  code_signature?: CodeSignature;
  pid?: number[];
  name?: string[];
  ppid?: number[];
  args?: string[];
  executable?: string[];
  title?: string[];
  thread?: Thread;
  working_directory?: string[];
}

export interface ProcessSessionData {
  entity_id?: string[];
  pid?: string[];
  name?: string[];
  start?: string[];
}

export interface ProcessHashData {
  md5?: string[];
  sha1?: string[];
  sha256?: string[];
}

export interface ProcessParentData {
  name?: string[];
  pid?: number[];
  executable?: string[];
}

export interface Thread {
  id?: number[];
  start?: string[];
  Ext?: Ext;
}
export interface ProcessPe {
  original_file_name?: string;
  company?: string;
  description?: string;
  file_version?: string;
}
