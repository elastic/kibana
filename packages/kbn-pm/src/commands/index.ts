import { Project } from '../utils/project';
import { ProjectGraph } from '../utils/projects';

export interface Command {
  name: string;
  description: string;

  run: (
    projects: Map<string, Project>,
    projectGraph: ProjectGraph,
    options: any
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
