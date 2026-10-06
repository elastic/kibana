import type { AliasAction } from '../../actions';
interface GetAliasActionOpts {
    indexPrefix: string;
    currentIndex: string;
    existingAliases: string[];
    kibanaVersion: string;
}
/**
 * Build the list of alias actions to perform, depending on the current state of the cluster.
 */
export declare const getAliasActions: ({ indexPrefix, currentIndex, existingAliases, kibanaVersion, }: GetAliasActionOpts) => AliasAction[];
export {};
