import type { FileKindBase } from '@kbn/shared-ux-file-types';
import type { FileKind } from '../types';
export interface FileKindsRegistry<FK extends FileKindBase = FileKind> {
    /**
     * Register a new file kind.
     */
    register(fileKind: FK): void;
    /**
     * Gets a {@link FileKind} or throws.
     */
    get(id: string): FK;
    /**
     * Return all registered {@link FileKind}s.
     */
    getAll(): FK[];
}
/**
 * @internal
 */
export declare class FileKindsRegistryImpl<FK extends FileKindBase = FileKind> implements FileKindsRegistry<FK> {
    private readonly onRegister?;
    constructor(onRegister?: ((fileKind: FK) => void) | undefined);
    private readonly fileKinds;
    register(fileKind: FK): void;
    get(id: string): FK;
    getAll(): FK[];
}
export declare const getFileKindsRegistry: import("@kbn/kibana-utils-plugin/common").Get<FileKindsRegistry<FileKind>>, setFileKindsRegistry: import("@kbn/kibana-utils-plugin/common").Set<FileKindsRegistry<FileKind>>;
