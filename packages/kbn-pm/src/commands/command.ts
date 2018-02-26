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
    validate: schema.Any;
  };
}

type Validates<T extends CommandSchema> = { [P in keyof T]: T[P]['validate'] };

export interface CommandRunOptions {
  [key: string]: schema.Any;
}

export interface CommandOptions<T> {
  name: string;
  description: string;
  additionalOptions?: T;
}

export type RunCommand<T extends CommandRunOptions> = (
  projects: ProjectMap,
  projectGraph: ProjectGraph,
  config: CommandConfig<schema.ObjectResultType<T>>
) => Promise<void>;

export function createCommand<T extends CommandSchema = {}>(
  { name, description, additionalOptions }: CommandOptions<T>,
  run: RunCommand<Validates<T>>
): Command<T> {
  return {
    name,
    description,
    additionalOptions,
    run,
  };
}

export type Command<T extends CommandSchema = {}> = CommandOptions<T> & {
  run: RunCommand<Validates<T>>;
};
