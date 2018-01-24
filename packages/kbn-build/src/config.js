import { resolve } from 'path';

/**
 * Returns all the paths where plugins are located
 */
export function getProjectPaths(rootPath, options) {
  const skipKibanaExtra = Boolean(options['skip-kibana-extra']);
  const skipKibana = Boolean(options['skip-kibana']);

  const projectPaths = [resolve(rootPath, 'packages/*')];

  if (!skipKibana) {
    projectPaths.push(rootPath);
  }

  if (!skipKibanaExtra) {
    projectPaths.push(resolve(rootPath, '../kibana-extra/*'));
  }

  return projectPaths;
}
