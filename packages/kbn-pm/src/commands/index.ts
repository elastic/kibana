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

import { BootstrapCommand } from './bootstrap';
import { CleanCommand } from './clean';
import { RunCommand } from './run';
import { WatchCommand } from './watch';

export const commands: { [key: string]: Command } = {
  bootstrap: BootstrapCommand,
  clean: CleanCommand,
  run: RunCommand,
  watch: WatchCommand,
};
