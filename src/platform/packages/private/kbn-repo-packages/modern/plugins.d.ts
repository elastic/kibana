/**
 * @param {{ rootDir: string }} options
 * @returns {string[]}
 */
export function getPluginSearchPaths({ rootDir }: {
    rootDir: string;
}): string[];
/**
 * @param {import('./types').PluginSelector} selector
 * @returns {(pkg: import('./package').Package) => pkg is import('./types').PluginPackage}
 */
export function getPluginPackagesFilter(selector?: import("./types").PluginSelector): (pkg: import("./package").Package) => pkg is import("./types").PluginPackage;
