/**
 * Returns the number of identical lines at the start and end of both arrays.
 * Lines are compared after trimming so that indentation differences introduced
 * by the LLM don't cause unchanged lines to appear in the diff.
 */
export declare function findChangedRegion(originalLines: string[], fixedLines: string[]): {
    prefixLen: number;
    suffixLen: number;
};
