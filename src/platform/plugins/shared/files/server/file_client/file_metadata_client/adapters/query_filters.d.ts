import type { KueryNode } from '@kbn/es-query';
import type { FindFileArgs } from '../../../file_service';
export declare function filterDeletedFiles({ attrPrefix }: {
    attrPrefix: string;
}): KueryNode;
export declare function filterArgsToKuery({ extension, mimeType, kind, kindToExclude, meta, name, status, user, attrPrefix, }: Omit<FindFileArgs, 'page' | 'perPage'> & {
    attrPrefix?: string;
}): KueryNode;
