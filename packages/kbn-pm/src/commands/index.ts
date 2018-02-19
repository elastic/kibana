import { ProjectGraph, ProjectMap } from '../utils/projects';

export interface CommandConfig {
  extraArgs: string[];
  options: { [key: string]: any };
  rootPath: string;
}

export interface Command {
  name: string;
  description: string;

  run: (
    projects: ProjectMap,
    projectGraph: ProjectGraph,
    config: CommandConfig
  ) => Promise<void>;
}

import * as bootstrap from './bootstrap';
import * as clean from './clean';
import * as run from './run';

export const commands: { [key: string]: Command } = {
  bootstrap,
  clean,
  run,
};
