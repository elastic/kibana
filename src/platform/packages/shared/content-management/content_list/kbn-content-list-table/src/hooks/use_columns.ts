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
import type { EuiBasicTableColumn } from '@elastic/eui';
import { useContentListConfig, type ContentListItem } from '@kbn/content-list-provider';
import type { ParsedPart } from '@kbn/content-list-assembly';
import type { ColumnBuilderContext } from '../column/types';
import { column } from '../column/part';

/** Default columns when no children are provided. */
const DEFAULT_PARTS: ParsedPart[] = [
  {
    type: 'part',
    part: 'column',
    preset: 'name',
    instanceId: 'name',
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
 * 3. Fall back to the default Name column if none are found.
 *
 * @param children - React children containing `Column` declarative components.
 * @returns Array of EUI table columns ready for `EuiBasicTable`.
 */
export const useColumns = (children: ReactNode): Array<EuiBasicTableColumn<ContentListItem>> => {
  const { item: itemConfig, isReadOnly, labels, supports } = useContentListConfig();

  return useMemo(() => {
    const parts = parseColumnParts(children);
    const context: ColumnBuilderContext = {
      itemConfig,
      isReadOnly,
      entityName: labels.entity,
      supports,
    };

    return parts
      .map((part) => column.resolve(part, context))
      .filter((col): col is EuiBasicTableColumn<ContentListItem> => col !== undefined);
    // `children` is intentionally excluded: JSX children create a new reference on every
    // parent render, so including them would defeat memoization. Re-running when context
    // deps change is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemConfig, isReadOnly, labels.entity, supports]);
};
