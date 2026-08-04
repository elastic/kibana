import type { ProcessingResult, ProcessingOptions } from '../types';
/**
 * Extract the first example from examples array, handling multi-line JSON safely
 */
declare function extractFirstExample(examples?: unknown[]): string | undefined;
/**
 * Main processing function
 */
export declare function processSemconvYaml(yamlFilePath: string, options?: ProcessingOptions): ProcessingResult;
export { extractFirstExample };
