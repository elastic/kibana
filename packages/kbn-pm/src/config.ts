import { resolve } from 'path';

export type ProjectPathOptions = {
  'skip-kibana-extra'?: boolean;
  'oss'?: boolean;
};

/**
 * Returns all the paths where plugins are located
 */
export function getProjectPaths(rootPath: string, options: ProjectPathOptions) {
  const skipKibanaExtra = Boolean(options['skip-kibana-extra']);
  const ossOnly = Boolean(options.oss);

  const projectPaths = [rootPath, resolve(rootPath, 'packages/*')];

  if (!ossOnly) {
    projectPaths.push(resolve(rootPath, 'x-pack'));
    projectPaths.push(resolve(rootPath, 'x-pack/plugins/*'));
  }

  if (!skipKibanaExtra) {
    projectPaths.push(resolve(rootPath, '../kibana-extra/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/packages/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/plugins/*'));
  }

  return projectPaths;
}
