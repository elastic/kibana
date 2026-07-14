interface GetAliasActionOpts {
    indexPrefix: string;
    kibanaVersion: string;
}
/**
 * Build the list of alias actions to perform, depending on the current state of the cluster.
 */
export declare const getCreationAliases: ({ indexPrefix, kibanaVersion, }: GetAliasActionOpts) => string[];
export {};
