import { resolve } from 'path';
import { schema } from '@kbn/utils';

export const projectPathsFields = {
  'skip-kibana': schema.boolean({ defaultValue: false }),
  'skip-kibana-extra': schema.boolean({ defaultValue: false }),
};

export type ProjectPathOptions = schema.ObjectResultType<typeof projectPathsFields>;

/**
 * Returns all the paths where plugins are located
 */
export function getProjectPaths(rootPath: string, options: ProjectPathOptions) {
  const skipKibanaExtra = options['skip-kibana-extra'];
  const skipKibana = options['skip-kibana'];

  const projectPaths = [resolve(rootPath, 'packages/*')];

  if (!skipKibana) {
    projectPaths.push(rootPath);
  }

  if (!skipKibanaExtra) {
    projectPaths.push(resolve(rootPath, '../kibana-extra/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/packages/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/plugins/*'));
  }

  return projectPaths;
}
