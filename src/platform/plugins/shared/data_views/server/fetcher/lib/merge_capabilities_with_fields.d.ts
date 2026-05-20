import type { FieldDescriptor } from '../index_patterns_fetcher';
export declare const mergeCapabilitiesWithFields: (rollupIndexCapabilities: Record<string, {}>, fieldsFromFieldCapsApi: Record<string, FieldDescriptor>, previousFields?: FieldDescriptor[]) => FieldDescriptor[];
