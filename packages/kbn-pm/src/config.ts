import { resolve } from 'path';

export type ProjectPathOptions = {
  'skip-kibana-extra'?: boolean;
  'skip-kibana'?: boolean;
};

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
