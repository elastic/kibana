import type { KibanaGroup, ModuleVisibility } from '@kbn/projects-solutions-groups';
export interface KibanaPackageJson {
    name: string;
    version: string;
    branch: string;
    build: {
        number: number;
        sha: string;
        distributable?: boolean;
        date: string;
    };
    dependencies: {
        [dep: string]: string;
    };
    devDependencies: {
        [dep: string]: string;
    };
    engines?: {
        [name: string]: string | undefined;
    };
    [key: string]: unknown;
    group?: KibanaGroup;
    visibility?: ModuleVisibility;
}
