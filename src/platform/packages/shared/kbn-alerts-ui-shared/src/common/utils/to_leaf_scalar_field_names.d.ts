import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
/**
 * Reduces the alert index fields down to the leaf-level scalar field names.
 * Object/nested containers and nested-object leaves are excluded because their
 * dot-path snapshot resolves to `null` (see issue #275054). Names are
 * de-duplicated and sorted alphabetically.
 */
export declare const toLeafScalarFieldNames: (fields: FieldDescriptor[]) => string[];
