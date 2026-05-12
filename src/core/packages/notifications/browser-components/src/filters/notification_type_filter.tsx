/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface NotificationTypeFilterProps {
  /** Type ids present in the current events stream. Rendered in the order given. */
  typeIds: readonly string[];
  /** Currently selected type ids. Empty set = "no filter applied". */
  selectedTypeIds: ReadonlySet<string>;
  /** Map from typeId → display label. Missing entries render the typeId itself. */
  labels?: Readonly<Record<string, string>>;
  /** Called with the next selection on every chip click (and on Clear all). */
  onChange: (next: ReadonlySet<string>) => void;
}

/**
 * Type-chip filter row for the notification center.
 *
 * Pure presentational component: state is owned by the caller. Designed to be
 * composed alongside other filter rows (read state, spaces) inside whatever
 * panel layout (accordion, popover) the consumer uses.
 *
 * Renders as an `EuiFilterGroup` of `EuiFilterButton`s with `isToggle={true}`.
 * EUI's filter button switches its color mode to INVERSE when both `isToggle`
 * and `isSelected` are set, so the selected state is visually obvious (filled
 * background instead of just a checkmark).
 */
export function NotificationTypeFilter({
  typeIds,
  selectedTypeIds,
  labels,
  onChange,
}: NotificationTypeFilterProps) {
  const isEmpty = selectedTypeIds.size === 0;

  const handleClearAll = useCallback(() => {
    onChange(new Set());
  }, [onChange]);

  const handleToggle = useCallback(
    (typeId: string) => {
      const next = new Set(selectedTypeIds);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      onChange(next);
    },
    [onChange, selectedTypeIds]
  );

  return (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('core.notifications.filters.types.title', {
                defaultMessage: 'Types',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            color="text"
            isDisabled={isEmpty}
            onClick={handleClearAll}
            data-test-subj="notificationTypeFilterClearAll"
          >
            {i18n.translate('core.notifications.filters.types.clearAll', {
              defaultMessage: 'Clear all',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {typeIds.length > 0 && (
        <EuiFilterGroup compressed>
          {typeIds.map((typeId, idx) => (
            <EuiFilterButton
              key={typeId}
              isToggle
              isSelected={selectedTypeIds.has(typeId)}
              withNext={idx < typeIds.length - 1}
              onClick={() => handleToggle(typeId)}
              data-test-subj={`notificationTypeFilterChip-${typeId}`}
            >
              {labels?.[typeId] ?? typeId}
            </EuiFilterButton>
          ))}
        </EuiFilterGroup>
      )}
    </div>
  );
}
