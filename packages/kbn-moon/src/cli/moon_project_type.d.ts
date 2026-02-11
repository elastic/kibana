/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MoonProjectConfig = DeepPartial<{
  type: string;
  language: string;
  owners: {
    defaultOwner: string;
  };
  toolchain:
    | string
    | {
        default: string;
      };
  project: {
    name: string;
    description: string;
    channel: string;
    owner: string | string[] | undefined;
    metadata: {
      sourceRoot: string;
    };
  };
  tags: string[];
  fileGroups: Record<string, string[]>;
  dependsOn: string[];
  tasks: Record<string, MoonTaskConfig>;
}> & {
  id: string;
};

export interface MoonTaskConfig {
  command?: string;
  script?: string;
  args?: string[];
  inputs?: string[];
  outputs?: string[];
  options?: object & {
    env?: Record<string, string>;
    cache?: boolean | 'local' | 'remote';
  };
  tags?: string[];
  dependsOn?: string[];
  local?: boolean;
}
