/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC, type ReactNode } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { RenderResourceBadge } from '@kbn/discover-contextual-components';
import { formatFieldStringValueWithHighlights, getFieldValue } from '@kbn/discover-utils';
import type { ContextAwarenessToolkit } from '../../../context_awareness';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { EntitySummaryBadge } from './entity_summary_badge';
import type { DiscoverFeaturesRegistry, EntitySummaryDefinition } from './types';

/**
 * A set of fields bound to an entity definition. The definition's concrete data type is captured in
 * the closure, so a mixed collection of bindings stays type-safe without widening to `unknown`.
 */
export interface EntitySummaryFieldBinding {
  fields: readonly string[];
  isAvailable: (registry: DiscoverFeaturesRegistry) => boolean;
  renderBadge: (args: {
    row: DataGridCellValueElementProps['row'];
    fieldName: string;
    formattedLabel?: ReactNode;
  }) => ReactNode;
}

/** Binds field names to an entity definition for use by the summary-column dispatch. */
export const createEntitySummaryBinding = <RawData,>({
  fields,
  definition,
  toolkit,
}: {
  fields: readonly string[];
  definition: EntitySummaryDefinition<RawData>;
  toolkit: ContextAwarenessToolkit;
}): EntitySummaryFieldBinding => ({
  fields,
  isAvailable: (registry) => definition.isAvailable(registry),
  renderBadge: ({ row, fieldName, formattedLabel }) => (
    <EntitySummaryBadge
      row={row}
      fieldName={fieldName}
      definition={definition}
      toolkit={toolkit}
      formattedLabel={formattedLabel}
    />
  ),
});

/**
 * Resolves a `renderResourceBadge` for the summary column: the chip for any bound field whose
 * definition is available becomes the entity-summary popover, and every other field falls back to
 * the default resource badge (by returning undefined).
 */
export const useEntitySummaryResourceBadge = ({
  bindings,
}: {
  bindings: EntitySummaryFieldBinding[];
}): RenderResourceBadge => {
  const { discoverShared } = useDiscoverServices();
  const { registry } = discoverShared.features;

  return useMemo<RenderResourceBadge>(() => {
    const byField = new Map<string, EntitySummaryFieldBinding>();
    for (const binding of bindings) {
      if (!binding.isAvailable(registry)) {
        continue;
      }
      for (const field of binding.fields) {
        byField.set(field, binding);
      }
    }

    return ({ field, row }) => {
      const binding = byField.get(field.name);
      if (!binding) {
        return undefined;
      }
      return binding.renderBadge({
        row,
        fieldName: field.name,
        formattedLabel: field.formattedValue,
      });
    };
  }, [bindings, registry]);
};

/**
 * Builds a dedicated-column cell renderer for an entity field: the entity-summary popover when the
 * definition is available, otherwise the profile's `FallbackCell` (preserving its search
 * highlighting, icon tooltip, and filter/copy actions).
 */
export const getEntitySummaryCell = <RawData,>({
  fieldName,
  definition,
  toolkit,
  FallbackCell,
}: {
  fieldName: string;
  definition: EntitySummaryDefinition<RawData>;
  toolkit: ContextAwarenessToolkit;
  FallbackCell: FC<DataGridCellValueElementProps>;
}): FC<DataGridCellValueElementProps> => {
  const EntitySummaryCell = (props: DataGridCellValueElementProps) => {
    const { discoverShared } = useDiscoverServices();
    const { registry } = discoverShared.features;

    const value = getFieldValue(props.row, fieldName);
    const formattedLabel = useMemo(
      () =>
        value == null
          ? null
          : formatFieldStringValueWithHighlights({
              value,
              hit: props.row.raw,
              fieldFormats: props.fieldFormats,
              dataView: props.dataView,
              fieldName,
            }),
      [value, props.row.raw, props.fieldFormats, props.dataView]
    );

    if (!definition.isAvailable(registry)) {
      return <FallbackCell {...props} />;
    }

    return (
      <EntitySummaryBadge
        row={props.row}
        fieldName={fieldName}
        definition={definition}
        toolkit={toolkit}
        formattedLabel={formattedLabel}
        data-test-subj="entitySummaryCell"
      />
    );
  };

  return EntitySummaryCell;
};
