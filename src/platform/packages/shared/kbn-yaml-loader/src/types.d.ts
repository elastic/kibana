/**
 * Type-only re-exports from the yaml package so consumers can type their APIs
 * without pulling in the runtime. Use loadYaml() for runtime usage.
 */
export type { Document, Pair } from 'yaml';
