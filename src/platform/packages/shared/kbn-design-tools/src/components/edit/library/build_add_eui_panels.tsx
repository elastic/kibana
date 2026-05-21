/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ADD_EUI_PANEL_ID, VARIANT_PANEL_PREFIX } from '../../../lib/constants';
import type { EuiComponentVariant, EuiLibraryEntry } from './library_entries';
import { EUI_LIBRARY } from './library_entries';

interface BuildPanelsOptions {
  onInsert: (element: ReactElement, libraryId?: string) => void;
  searchTerms: Record<string, string>;
  onSearchChange: (panelId: string, value: string) => void;
}

const makeSearchItem = (
  panelId: string,
  placeholder: string,
  searchTerms: Record<string, string>,
  onSearchChange: (panelId: string, value: string) => void
): EuiContextMenuPanelItemDescriptor => ({
  renderItem: () => (
    <div css={css({ padding: '8px 8px 4px' })}>
      <EuiFieldSearch
        placeholder={placeholder}
        value={searchTerms[panelId] ?? ''}
        onChange={(e) => onSearchChange(panelId, e.target.value)}
        compressed
        autoFocus
      />
    </div>
  ),
});

/**
 * Build the context menu panel descriptors for the "Add from EUI" feature.
 * Each panel has a search field (via renderItem) followed by filtered items.
 */
export const buildAddEuiPanels = ({
  onInsert,
  searchTerms,
  onSearchChange,
}: BuildPanelsOptions): EuiContextMenuPanelDescriptor[] => {
  const mainSearch = (searchTerms[ADD_EUI_PANEL_ID] ?? '').toLowerCase().trim();

  const filteredEntries = mainSearch
    ? EUI_LIBRARY.filter((entry) => entry.label.toLowerCase().includes(mainSearch))
    : EUI_LIBRARY;

  const mainPanel: EuiContextMenuPanelDescriptor = {
    id: ADD_EUI_PANEL_ID,
    title: i18n.translate('kbnDesignTools.edit.library.panelTitle', {
      defaultMessage: 'Add from EUI',
    }),
    width: 200,
    items: [
      makeSearchItem(
        ADD_EUI_PANEL_ID,
        i18n.translate('kbnDesignTools.edit.library.searchPlaceholder', {
          defaultMessage: 'Search components...',
        }),
        searchTerms,
        onSearchChange
      ),
      ...filteredEntries.map((entry) => ({
        name: entry.label,
        panel: entry.variants ? `${VARIANT_PANEL_PREFIX}${entry.label}` : undefined,
        onClick: entry.variants ? undefined : () => onInsert(entry.element, entry.label),
      })),
    ],
  };

  const variantPanels: EuiContextMenuPanelDescriptor[] = EUI_LIBRARY.filter(
    (e): e is EuiLibraryEntry & { variants: EuiComponentVariant[] } => !!e.variants
  ).map((entry) => {
    const panelId = `${VARIANT_PANEL_PREFIX}${entry.label}`;
    const search = (searchTerms[panelId] ?? '').toLowerCase().trim();
    const filtered = search
      ? entry.variants.filter((v) => v.label.toLowerCase().includes(search))
      : entry.variants;

    return {
      id: panelId,
      title: entry.label,
      width: 200,
      items: [
        makeSearchItem(
          panelId,
          i18n.translate('kbnDesignTools.edit.library.searchVariantsPlaceholder', {
            defaultMessage: 'Search {label}...',
            values: { label: entry.label.toLowerCase() },
          }),
          searchTerms,
          onSearchChange
        ),
        ...filtered.map((variant) => ({
          name: variant.label,
          onClick: () => onInsert(variant.element, `${entry.label}/${variant.label}`),
        })),
      ],
    };
  });

  return [mainPanel, ...variantPanels];
};
