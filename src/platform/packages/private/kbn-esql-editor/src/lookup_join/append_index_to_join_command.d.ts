import type { monaco } from '@kbn/code-editor';
export declare function appendIndexToJoinCommandByName(query: string, targetName: string, createdIndexName: string): string;
export declare function appendIndexToJoinCommandByPosition(query: string, position: monaco.Position, createdIndexName: string): string;
