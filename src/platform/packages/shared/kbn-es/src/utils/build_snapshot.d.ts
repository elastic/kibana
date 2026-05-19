import type { ToolingLog } from '@kbn/tooling-log';
interface BuildSnapshotOptions {
    license: string;
    sourcePath: string;
    log: ToolingLog;
    platform?: string;
}
/**
 * Creates archive from source
 *
 * Gradle tasks:
 *   $ ./gradlew tasks --all | grep 'distribution.*assemble\s'
 *   :distribution:archives:darwin-tar:assemble
 *   :distribution:archives:linux-tar:assemble
 *   :distribution:archives:windows-zip:assemble
 */
export declare function buildSnapshot({ license, sourcePath, log, platform, }: BuildSnapshotOptions): Promise<string>;
export declare function archiveForPlatform(platform: NodeJS.Platform, license: string): {
    format: string;
    ext: string;
    task: string;
    platform: string;
};
export {};
