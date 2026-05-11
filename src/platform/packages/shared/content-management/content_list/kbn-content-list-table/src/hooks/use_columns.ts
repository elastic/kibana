/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useEuiTheme, type EuiBasicTableColumn } from '@elastic/eui';
import { useContentListConfig, type ContentListItem } from '@kbn/content-list-provider';
import type { ParsedPart, SkeletonOutput } from '@kbn/content-list-assembly';
import type { ColumnBuilderContext } from '../column/types';
import { column } from '../column/part';
import { inferColumnSkeleton } from '../skeleton/infer_skeleton';

/**
 * A resolved column plus the skeleton shape the table skeleton should draw
 * in its place during `'initialLoad'`.
 *
 * `skeleton` is either the preset's own {@link SkeletonOutput} (when
 * registered via `column.createPreset({ skeleton })`) or an inferred
 * descriptor derived from the real column's metadata.
 */
export interface ResolvedColumn {
  /** The real column handed to `EuiBasicTable`. */
  column: EuiBasicTableColumn<ContentListItem>;
  /** Skeleton shape descriptor — preset-provided or inferred. */
  skeleton: SkeletonOutput;
}

/**
 * Default columns when no children are provided.
 *
 * Provides Name, Last updated, and Actions columns out of the box.
 * The Actions column auto-hides when the provider has no edit/delete handlers
 * configured, and individual actions are shown/hidden based on the item config.
 * Any explicit `<Column.*>` child replaces **all** defaults.
 */
const DEFAULT_PARTS: ParsedPart[] = [
  {
    type: 'part',
    part: 'column',
    preset: 'name',
    instanceId: 'name',
    attributes: {},
  },
  {
    type: 'part',
    part: 'column',
    preset: 'updatedAt',
    instanceId: 'updatedAt',
    attributes: {},
  },
  {
    type: 'part',
    part: 'column',
    preset: 'actions',
    instanceId: 'actions',
    attributes: {},
  },
];

/**
 * Parse column parts from children, falling back to defaults.
 *
 * Uses `column.parseChildren` to extract only column parts from the
 * declarative children. Falls back to the default Name column when no
 * children are provided or no valid column parts are found.
 */
const parseColumnParts = (children: ReactNode): ParsedPart[] => {
  if (children === undefined) {
    return DEFAULT_PARTS;
  }

  const parts = column.parseChildren(children);
  return parts.length > 0 ? parts : DEFAULT_PARTS;
};

/**
 * Hook to parse and build table columns from declarative children.
 *
 * Encapsulates the full column resolution flow:
 * 1. Parse declarative `Column` components from children via `column.parseChildren`.
 * 2. Resolve `EuiBasicTableColumn` definitions via `column.resolve`.
 * 3. Resolve per-preset skeleton descriptors via `column.resolveSkeleton`,
 *    falling back to inference from the resolved column metadata.
 * 4. Fall back to the default columns if none are found.
 *
 * @param children - React children containing `Column` declarative components.
 * @param onDelete - Optional callback invoked by the default Delete action.
 * @returns Array of {@link ResolvedColumn} entries — each pairing an
 *   `EuiBasicTableColumn` (for the real table) with a `SkeletonOutput`
 *   (for the loading skeleton).
 */
export const useColumns = (
  children: ReactNode,
  onDelete?: (items: ContentListItem[]) => void
): ResolvedColumn[] => {
  const { item: itemConfig, isReadOnly, labels, supports } = useContentListConfig();
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const parts = parseColumnParts(children);
    const context: ColumnBuilderContext = {
      itemConfig,
      isReadOnly,
      entityName: labels.entity,
      supports,
      actions: { onDelete },
      euiTheme,
    };

    const resolved: ResolvedColumn[] = [];

    for (const part of parts) {
      const resolvedColumn = column.resolve(part, context);
      // A preset resolver may intentionally return `undefined` to signal
      // the column should be skipped (read-only mode, missing handlers,
      // etc.). Drop those without producing a skeleton either.
      if (resolvedColumn === undefined) {
        continue;
      }

      const presetSkeleton = column.resolveSkeleton(part, context);
      const skeleton = presetSkeleton ?? inferColumnSkeleton(resolvedColumn);

      resolved.push({ column: resolvedColumn, skeleton });
    }

    return resolved;
    // `children` is intentionally excluded: JSX children create a new reference on every
    // parent render, so including them would defeat memoization. Re-running when context
    // deps change is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemConfig, isReadOnly, labels.entity, supports, onDelete, euiTheme]);
};
