import type { SemconvStructuredFieldDefinitions } from '../types/semconv_types';
/**
 * Get all hardcoded field mappings from OTLP protocol definitions
 * These represent core telemetry structure fields that are not covered by semantic conventions
 */
export declare function getHardcodedMappings(): SemconvStructuredFieldDefinitions;
