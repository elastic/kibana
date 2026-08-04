import type { Document, YAMLMap } from 'yaml';
export declare function isStepLikeMap(item: unknown): item is YAMLMap;
export declare function getStepNodesWithType(yamlDocument: Document): YAMLMap[];
