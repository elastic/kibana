import type { CodeSignature, Ext, Hash } from '../file';
import type { ProcessPe } from '../process';
export interface DllEcs {
    Ext?: Ext;
    path?: string;
    code_signature?: CodeSignature;
    pe?: ProcessPe;
    hash?: Hash;
}
