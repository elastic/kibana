import { resolve } from 'path';
import { schema } from '@kbn/utils';

export const projectPathsSchema = schema.partialObject({
  'skip-kibana': schema.boolean(),
  'skip-kibana-extra': schema.boolean(),
});

export type ProjectPathOptions = schema.TypeOf<typeof projectPathsSchema>;

/**
 * Returns all the paths where plugins are located
 */
export function getProjectPaths(rootPath: string, options: ProjectPathOptions) {
  const skipKibanaExtra = Boolean(options['skip-kibana-extra']);
  const skipKibana = Boolean(options['skip-kibana']);

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
