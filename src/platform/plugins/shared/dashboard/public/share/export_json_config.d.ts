import type { ExportShareDerivatives } from '@kbn/share-plugin/public';
export declare const exportJsonConfig: ReturnType<ExportShareDerivatives['config']> extends Promise<infer R> ? R : never;
