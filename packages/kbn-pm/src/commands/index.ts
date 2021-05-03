/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ProjectGraph, ProjectMap } from '../utils/projects';

export interface ICommandConfig {
  extraArgs: string[];
  options: { [key: string]: any };
  rootPath: string;
  kbn: Kibana;
}

export interface ICommand {
  name: string;
  description: string;
  reportTiming?: {
    group: string;
    id: string;
  };

  run: (projects: ProjectMap, projectGraph: ProjectGraph, config: ICommandConfig) => Promise<void>;
}

import { BootstrapCommand } from './bootstrap';
import { BuildBazelCommand } from './build_bazel';
import { CleanCommand } from './clean';
import { ResetCommand } from './reset';
import { RunCommand } from './run';
import { WatchCommand } from './watch';
import { WatchBazelCommand } from './watch_bazel';
import { Kibana } from '../utils/kibana';

export const commands: { [key: string]: ICommand } = {
  bootstrap: BootstrapCommand,
  'build-bazel': BuildBazelCommand,
  clean: CleanCommand,
  reset: ResetCommand,
  run: RunCommand,
  watch: WatchCommand,
  'watch-bazel': WatchBazelCommand,
};
