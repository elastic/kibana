import type { ToolingLog } from '@kbn/tooling-log';
/**
 * Copies config references to an absolute path to
 * the provided destination. This is necessary as ES security
 * requires files to be within the installation directory
 */
export declare function extractConfigFiles(config: string | string[], dest: string, options?: {
    log: ToolingLog;
}): string[];
export declare function isFile(dest?: string): boolean;
export declare function copyFileSync(src: string, dest: string): void;
