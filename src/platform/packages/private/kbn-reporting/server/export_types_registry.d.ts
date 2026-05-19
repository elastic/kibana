import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { ExportType } from '.';
type GetCallbackFn = (item: ExportType) => boolean;
export declare class ExportTypesRegistry {
    private licensing;
    private _map;
    constructor(licensing: LicensingPluginSetup);
    register(item: ExportType): void;
    getAll(): ExportType<any, any, import("./export_type").BaseExportTypeSetupDeps, import("./export_type").BaseExportTypeStartDeps>[];
    getSize(): number;
    getById(id: string): ExportType;
    getByJobType(jobType: ExportType['jobType']): ExportType;
    get(findType: GetCallbackFn): ExportType;
    private registerFeatureUsageName;
}
export {};
