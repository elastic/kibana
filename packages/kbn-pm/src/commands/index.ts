import { ProjectGraph, ProjectMap } from '../utils/projects';
import { ProjectPathOptions } from '../config';

export interface CommandConfig<T extends {}> {
  extraArgs: string[];
  options: ProjectPathOptions & T;
  rootPath: string;
}

export interface Command<T extends {} = {}> {
  name: string;
  description: string;

  run: (
    projects: ProjectMap,
    projectGraph: ProjectGraph,
    config: CommandConfig<T>
  ) => Promise<void>;
}

import { BootstrapCommand } from './bootstrap';
import { CleanCommand } from './clean';
import { RunCommand } from './run';

export const commands: { [key: string]: Command<any> } = {
  bootstrap: BootstrapCommand,
  clean: CleanCommand,
  run: RunCommand,
};
