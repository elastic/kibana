import type { ESQLCallbacks } from '@kbn/esql-types';
export declare function getPolicyHelper(resourceRetriever?: ESQLCallbacks): {
    getPolicies: () => Promise<{
        name: string;
        sourceIndices: string[];
        matchField: string;
        enrichFields: string[];
    }[]>;
    getPolicyMetadata: (policyName: string) => Promise<{
        name: string;
        sourceIndices: string[];
        matchField: string;
        enrichFields: string[];
    } | undefined>;
};
export declare function getSourcesHelper(resourceRetriever?: ESQLCallbacks): () => Promise<import("@kbn/esql-types").ESQLSourceResult[]>;
export declare function getFromCommandHelper(resourceRetriever?: ESQLCallbacks): Promise<string>;
