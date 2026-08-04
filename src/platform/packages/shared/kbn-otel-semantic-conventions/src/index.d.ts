export type { TSemconvFields, SemconvFieldName } from './types';
export { semconvFlat } from './generated/resolved-semconv';
export { RESOURCE_ECS_FIELDS as RESOURCE_FIELDS, prefixOTelField } from './resource_fields';
export { processSemconvYaml } from './lib/generate_semconv';
export { cli } from './cli';
export type { ResolvedSemconvYaml, YamlGroup, ProcessingResult, ProcessingOptions, } from './types/semconv_types';
