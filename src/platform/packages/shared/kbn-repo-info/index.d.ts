declare namespace _exports {
    export { KibanaPackageJson };
}
declare namespace _exports {
    export { REPO_ROOT };
    export { PKG_JSON };
    export { PKG_JSON as kibanaPackageJson };
    export function isKibanaDistributable(): boolean;
    export { UPSTREAM_BRANCH };
    export { fromRoot };
}
export = _exports;
type KibanaPackageJson = import("./types").KibanaPackageJson;
declare const REPO_ROOT: string;
declare const PKG_JSON: import("./types").KibanaPackageJson;
declare const UPSTREAM_BRANCH: string;
/**
 * @param {string[]} paths
 */
declare function fromRoot(...paths: string[]): string;
