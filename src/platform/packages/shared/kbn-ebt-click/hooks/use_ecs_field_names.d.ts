import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
/**
 * Resolves which field names in the given list are officially registered ECS fields.
 * Returns null while the check is in progress or when fieldsMetadata is not provided,
 * and a Set of ECS field names once resolved.
 *
 * Fields with a `short` description in the ECS registry are considered official ECS fields
 * and safe to emit as `data-ebt-detail` values. Fields not in the registry receive the
 * NON_ECS_FIELD_EBT_DETAIL sentinel to avoid leaking field names into telemetry.
 *
 * Note: the registry covers ECS-defined fields only. Standard fields from other schemas
 * (e.g. APM-specific `span.name`, OTel `k8s.pod.name`) are not ECS-registered and will
 * receive the sentinel even though they are well-known standard fields.
 *
 * @see https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/discover/public/ebt_manager/scoped_discover_ebt_manager.ts
 */
export declare function useEcsFieldNames(fieldNames: string[], fieldsMetadata: FieldsMetadataPublicStart | undefined): Set<string> | null;
