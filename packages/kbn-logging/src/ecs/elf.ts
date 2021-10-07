/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-elf.html
 *
 * @internal
 */
export interface EcsElf {
  architecture?: string;
  byte_order?: string;
  cpu_type?: string;
  creation_date?: string;
  exports?: Export[];
  imports?: Import[];
  header?: Header;
  sections?: Section[];
  segments?: Segment[];
  shared_libraries?: string[];
  telfhash?: string;
}

interface Export {
  binding?: string;
  name?: string;
  section?: string;
  size?: string;
  type?: string;
  version?: string;
  visibility?: string;
}

interface Import {
  library?: string;
  name?: string;
  type?: string;
  version?: string;
}

interface Header {
  abi_version?: string;
  class?: string;
  data?: string;
  entrypoint?: number;
  object_version?: string;
  os_abi?: string;
  type?: string;
  version?: string;
}

interface Section {
  chi2?: number;
  entropy?: number;
  flags?: string;
  name?: string;
  physical_offset?: string;
  physical_size?: number;
  type?: string;
  virtual_address?: number;
  virtual_size?: number;
}

interface Segment {
  sections?: string;
  type?: string;
}
