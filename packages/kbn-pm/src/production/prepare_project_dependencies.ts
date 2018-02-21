import { Project } from '../utils/project';
import { isLinkDependency } from '../utils/package_json';

/**
 * All external projects are located within `../kibana-extra/{plugin}` relative
 * to Kibana itself.
 */
const isKibanaDep = (depVersion: string) =>
  depVersion.includes('../../kibana/');

/**
 * This prepares the dependencies for an _external_ project.
 */
export async function prepareExternalProjectDependencies(projectPath: string) {
  const project = await Project.fromPath(projectPath);

  if (!project.hasDependencies()) {
    return;
  }

  const deps = project.allDependencies;

  for (const depName of Object.keys(deps)) {
    const depVersion = deps[depName];

    // Kibana currently only supports `link:` dependencies on Kibana's own
    // packages, as these are packaged into the `node_modules` folder when
    // Kibana is built, so we don't need to take any action to enable
    // `require(...)` to resolve for these packages.
    if (isLinkDependency(depVersion) && !isKibanaDep(depVersion)) {
      // For non-Kibana packages we need to set up symlinks during the
      // installation process, but this is not something we support yet.
      throw new Error(
        'This plugin is using `link:` dependencies for non-Kibana packages'
      );
    }
  }
}
