import type { HttpStart } from '@kbn/core/public';
export declare function fetchExportObjects(http: HttpStart, objects: any[], includeReferencesDeep?: boolean): Promise<Blob>;
