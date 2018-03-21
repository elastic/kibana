import { schema } from '@kbn/utils';
import { ProjectGraph, ProjectMap } from '../utils/projects';
import { ProjectPathOptions } from '../config';

export interface CommandSchema {
  [key: string]: {
    description: string;
    schema: schema.Any;
  };
}

export type AdditionalOptionsSchemas<T extends CommandSchema> = {
  [P in keyof T]: T[P]['schema']
};

export type ValidatedOptions<T extends CommandSchema> = schema.ObjectResultType<
  AdditionalOptionsSchemas<T>
>;

export interface CommandOptions<T> {
  name: string;
  description: string;
  options?: T;
}

export type RunCommand<T extends CommandSchema> = (
  opts: {
    projects: ProjectMap;
    projectGraph: ProjectGraph;
    extraArgs: string[];
    options: ProjectPathOptions & ValidatedOptions<T>;
    rootPath: string;
  }
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

export type Command<T extends CommandSchema> = CommandOptions<T> & {
  run: RunCommand<T>;
};
