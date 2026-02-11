/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { FindFieldsMetadataResponsePayload } from '@kbn/fields-metadata-plugin/common/latest';
import type { UnifiedMetricsGridProps } from '../../types';
import type { MetricField } from '../../types';

export interface FieldsMetadataContext {
  fieldsMetadata: FindFieldsMetadataResponsePayload['fields'] | undefined;
  isFieldsMetadataLoading: boolean;
}

const FieldsMetadataContext = React.createContext<FieldsMetadataContext>({
  fieldsMetadata: undefined,
  isFieldsMetadataLoading: false,
});

function FieldsMetadataProvider({
  children,
  fields,
  services,
}: {
  children: React.ReactNode;
  fields: MetricField[];
} & Pick<UnifiedMetricsGridProps, 'services'>) {
  const [accumulatedMetadata, setAccumulatedMetadata] = useState<
    FindFieldsMetadataResponsePayload['fields']
  >({});
  const seenFields = useRef<Set<string>>(new Set());

  const isFieldsMetadataAvailable = useMemo(
    () => !!services.fieldsMetadata,
    [services.fieldsMetadata]
  );

  const unseenFields = useMemo(
    () =>
      isFieldsMetadataAvailable
        ? (fields || [])
            .filter((field) => !seenFields.current.has(field.name))
            .map((field) => field.name)
        : [],
    [fields, isFieldsMetadataAvailable]
  );

  const { fieldsMetadata: newMetadata, loading } =
    services.fieldsMetadata?.useFieldsMetadata(
      {
        fieldNames: unseenFields,
        attributes: ['description'],
      },
      [unseenFields]
    ) ?? {};

  useEffect(() => {
    if (newMetadata && Object.keys(newMetadata).length > 0) {
      unseenFields.forEach((field) => {
        seenFields.current.add(field);
      });

      setAccumulatedMetadata((prev) => ({ ...prev, ...newMetadata }));
    }
  }, [newMetadata, unseenFields]);

  const contextValue = useMemo(
    () => ({
      fieldsMetadata: accumulatedMetadata,
      isFieldsMetadataLoading: loading ?? false,
    }),
    [accumulatedMetadata, loading]
  );

  return (
    <FieldsMetadataContext.Provider value={contextValue}>{children}</FieldsMetadataContext.Provider>
  );
}

export { FieldsMetadataProvider, FieldsMetadataContext };
