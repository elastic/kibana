/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

/**
 * Resolves which field names in the given list are officially registered ECS fields.
 * Returns null while the check is in progress or when fieldsMetadata is not provided,
 * and a Set of ECS field names once resolved.
 *
 * Fields with a `short` description in the ECS registry are considered official ECS fields
 * and safe to emit as `data-ebt-detail` values. Non-ECS fields should use the
 * NON_ECS_FIELD_EBT_DETAIL sentinel instead to avoid leaking custom field names into telemetry.
 *
 * https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/discover/public/ebt_manager/scoped_discover_ebt_manager.ts
 */
export function useEcsFieldNames(
  fieldNames: string[],
  fieldsMetadata: FieldsMetadataPublicStart | undefined
): Set<string> | null {
  const [ecsFieldNames, setEcsFieldNames] = useState<Set<string> | null>(null);

  useEffect(() => {
    setEcsFieldNames(null);
    if (!fieldsMetadata || fieldNames.length === 0) return;
    let cancelled = false;
    fieldsMetadata
      .getClient()
      .then((client) => client.find({ attributes: ['short'], fieldNames }))
      .then(({ fields: ecsFields }) => {
        if (cancelled) return;
        setEcsFieldNames(
          new Set(
            Object.entries(ecsFields)
              .filter(([, def]) => Boolean(def?.short))
              .map(([name]) => name)
          )
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fieldNames, fieldsMetadata]);

  return ecsFieldNames;
}
