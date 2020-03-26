/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  run: (projects: ProjectMap, projectGraph: ProjectGraph, config: ICommandConfig) => Promise<void>;
}

import { BootstrapCommand } from './bootstrap';
import { CleanCommand } from './clean';
import { RunCommand } from './run';
import { WatchCommand } from './watch';
import { Kibana } from '../utils/kibana';

export const commands: { [key: string]: ICommand } = {
  bootstrap: BootstrapCommand,
  clean: CleanCommand,
  run: RunCommand,
  watch: WatchCommand,
};
