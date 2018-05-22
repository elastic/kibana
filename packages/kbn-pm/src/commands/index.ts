import { ProjectGraph, ProjectMap } from '../utils/projects';

export interface ICommandConfig {
  extraArgs: string[];
  options: { [key: string]: any };
  rootPath: string;
}

export interface ICommand {
  name: string;
  description: string;

  run: (
    projects: ProjectMap,
    projectGraph: ProjectGraph,
    config: ICommandConfig
  ) => Promise<void>;
}

import { BootstrapCommand } from './bootstrap';
import { CleanCommand } from './clean';
import { RunCommand } from './run';
import { WatchCommand } from './watch';

export const commands: { [key: string]: ICommand } = {
  bootstrap: BootstrapCommand,
  clean: CleanCommand,
  run: RunCommand,
  watch: WatchCommand,
};
