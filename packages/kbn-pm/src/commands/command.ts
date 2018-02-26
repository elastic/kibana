import { schema } from '@kbn/utils';
import { ProjectGraph, ProjectMap } from '../utils/projects';
import { ProjectPathOptions } from '../config';

export interface CommandConfig<T extends {}> {
  extraArgs: string[];
  options: ProjectPathOptions & T;
  rootPath: string;
}

export interface CommandSchema {
  [key: string]: {
    description: string;
    schema: schema.Any;
  };
}

type AdditionalOptionsSchemas<T extends CommandSchema> = {
  [P in keyof T]: T[P]['schema']
};

export interface CommandRunOptions {
  [key: string]: schema.Any;
}

export interface CommandOptions<T> {
  name: string;
  description: string;
  additionalOptions?: T;
}

export type RunCommand<T extends CommandSchema> = (
  projects: ProjectMap,
  projectGraph: ProjectGraph,
  config: CommandConfig<schema.ObjectResultType<AdditionalOptionsSchemas<T>>>
) => Promise<void>;

export function createCommand<T extends CommandSchema = {}>(
  commandOptions: CommandOptions<T>,
  run: RunCommand<T>
): Command<T> {
  return {
    ...commandOptions,
    run,
  };
}

export type Command<T extends CommandSchema = {}> = CommandOptions<T> & {
  run: RunCommand<T>;
};
