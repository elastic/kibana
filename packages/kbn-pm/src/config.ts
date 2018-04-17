import { resolve } from 'path';

export type ProjectPathOptions = {
  'skip-kibana-extra'?: boolean;
};

/**
 * Returns all the paths where plugins are located
 */
export function getProjectPaths(rootPath: string, options: ProjectPathOptions) {
  const skipKibanaExtra = Boolean(options['skip-kibana-extra']);

  const projectPaths = [
    rootPath,
    resolve(rootPath, 'packages/*'),
    resolve(rootPath, 'platform'),
  ];

  if (!skipKibanaExtra) {
    projectPaths.push(resolve(rootPath, '../kibana-extra/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/packages/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/plugins/*'));
  }

  return projectPaths;
}
