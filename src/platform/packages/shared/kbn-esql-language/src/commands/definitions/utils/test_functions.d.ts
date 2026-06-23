/**
 * This file contains a mechanism for injecting test functions into the
 * validation tests. This allows us to use our own fixtures without relying
 * on the generated definitions provided by Elasticsearch.
 */
import type { FunctionDefinition } from '../types';
export declare const setTestFunctions: (functions: FunctionDefinition[]) => void;
export declare const getTestFunctions: () => FunctionDefinition[];
