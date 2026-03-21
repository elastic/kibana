import type { Document } from 'yaml';
export interface StepsElseKeyOffsets {
    stepsKeyStartOffsets: number[];
    elseKeyStartOffsets: number[];
}
export declare function getStepsAndElseKeyOffsets(document: Document): StepsElseKeyOffsets;
export interface BlockKeyInfo {
    keyStartOffset: number;
    rangeStart: number;
    rangeEnd: number;
}
export declare function getInnermostBlockContainingOffset(document: Document, cursorOffset: number): BlockKeyInfo | null;
