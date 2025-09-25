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
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';

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
} & Pick<ChartSectionProps, 'services'>) {
  const { useFieldsMetadata } = services.fieldsMetadata;
  const [accumulatedMetadata, setAccumulatedMetadata] = useState<
    FindFieldsMetadataResponsePayload['fields']
  >({});
  const seenFields = useRef<Set<string>>(new Set());

  const unseenFields = useMemo(
    () => (fields || []).filter((field) => !seenFields.current.has(field.name)),
    [fields]
  );

  const { fieldsMetadata: newMetadata, loading } = useFieldsMetadata(
    {
      fieldNames: unseenFields.map((field) => field.name),
      attributes: ['description', 'source'],
    },
    [unseenFields]
  );

  useEffect(() => {
    if (newMetadata && Object.keys(newMetadata).length > 0) {
      unseenFields.forEach((field) => {
        seenFields.current.add(field.name);
      });

      setAccumulatedMetadata((prev) => ({ ...prev, ...newMetadata }));
    }
  }, [newMetadata, unseenFields]);

  const contextValue = useMemo(
    () => ({
      fieldsMetadata: accumulatedMetadata,
      isFieldsMetadataLoading: loading,
    }),
    [accumulatedMetadata, loading]
  );

  return (
    <FieldsMetadataContext.Provider value={contextValue}>{children}</FieldsMetadataContext.Provider>
  );
}

export { FieldsMetadataProvider, FieldsMetadataContext };
