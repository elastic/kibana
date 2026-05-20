import type { FilesRouter } from '../types';
import type { FileKindRouter } from './types';
interface Args {
    router: FilesRouter;
    fileKind: string;
}
/**
 * Wraps {@link FilesRouter}, adding a middle man for injecting file-kind into
 * route handler context
 */
export declare function enhanceRouter({ router, fileKind }: Args): FileKindRouter;
export {};
