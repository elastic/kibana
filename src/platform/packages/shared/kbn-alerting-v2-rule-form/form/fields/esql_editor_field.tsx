/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { Controller, type Control, type FieldPath } from 'react-hook-form';
import { EuiFormRow } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLEditorProps } from '@kbn/esql-editor';
import type { FormValues } from '../types';
import type { RuleFieldsServices } from '../rule_fields';

const LazyESQLEditor = React.lazy(() =>
  import('@kbn/esql-editor').then((module) => ({
    default: module.default as React.ComponentType<ESQLEditorProps>,
  }))
);

type ESQLEditorFieldProps = Omit<
  ESQLEditorProps,
  'query' | 'onTextLangQueryChange' | 'onTextLangQuerySubmit'
> & {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  label?: string;
  helpText?: string;
  onSubmit?: (query: string) => Promise<void>;
  services: RuleFieldsServices;
};

const ESQLEditor: React.FC<
  ESQLEditorFieldProps & { onChange: (value: string) => void; value: string }
> = ({ control, name, label, helpText, onSubmit, services, value, onChange, ...editorProps }) => {
  // Construct the services object for KibanaContextProvider
  // The ESQLEditor expects services in a specific shape via useKibana()
  const query: AggregateQuery = useMemo(() => ({ esql: value as string }), [value]);

  const handleQueryChange = useCallback(
    (newQuery: AggregateQuery) => {
      onChange(newQuery.esql ?? '');
    },
    [onChange]
  );

  const handleQuerySubmit = useCallback(
    async (submittedQuery?: AggregateQuery) => {
      if (onSubmit && submittedQuery?.esql) {
        await onSubmit(submittedQuery.esql);
      }
    },
    [onSubmit]
  );

  return (
    <EuiFormRow label={label} helpText={helpText} fullWidth>
      <KibanaContextProvider
        services={{
          ...services,
          ...services.core,
        }}
      >
        <React.Suspense fallback={<div />}>
          <LazyESQLEditor
            query={query}
            onTextLangQueryChange={handleQueryChange}
            onTextLangQuerySubmit={handleQuerySubmit}
            hideRunQueryText
            hideRunQueryButton
            hideQueryHistory
            hideQuickSearch
            hasOutline
            {...editorProps}
          />
        </React.Suspense>
      </KibanaContextProvider>
    </EuiFormRow>
  );
};

export const ESQLEditorField: React.FC<ESQLEditorFieldProps> = ({
  control,
  name,
  label,
  helpText,
  onSubmit,
  services,
  ...editorProps
}) => {
  // Construct the services object for KibanaContextProvider
  // The ESQLEditor expects services in a specific shape via useKibana()
  const kibanaServices = useMemo(
    () => ({
      ...services,
      ...services.core,
    }),
    [services]
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        return (
          <ESQLEditor
            value={value}
            onChange={onChange}
            label={label}
            helpText={helpText}
            onSubmit={onSubmit}
            services={kibanaServices}
            isInvalid={!!error}
            error={error ? error.message : undefined}
            {...editorProps}
          />
        );
      }}
    />
  );
};
