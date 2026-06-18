/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiText,
  EuiWrappingPopover,
  type IconType,
  EuiListGroup,
  EuiButtonIcon,
  EuiToolTip,
  EuiListGroupItem,
  EuiFlexItem,
  EuiContextMenuItem,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { SerializableRecord } from '@kbn/utility-types';
import type { NavExtensionPointBaseComponentProps, NavTemplateActionConfig } from '../types';
import { getField, getStringField } from '../utils/get_field';

interface NormalizedRow {
  id: string;
  index: number;
  label: string;
  href: string;
  iconType?: IconType;
}

interface ListTemplateSearchConfig {
  enabled: boolean;
  placeholder?: string;
}

interface ListTemplateAddItemConfig {
  enabled: boolean;
  onClick: () => void;
}

export type ListTemplateConfig<Data = SerializableRecord> = {
  item: {
    /** field property path of the data record, mapped as the displayed item's id */
    idField: keyof Data;
    /** field property path of the data record, mapped as the displayed item's label */
    labelField: keyof Data;
    /** field property path of the data record, mapped as the displayed item's href */
    hrefField: keyof Data;
    /** field property path of the data record, mapped as the displayed item's icon */
    iconField?: keyof Data;
    /** field property path of the data record, mapped as the displayed item's badge */
    badgeField?: keyof Data;
  };
  /** Optional section-level actions. */
  actions?: NavTemplateActionConfig<Data>[];
  /** Message shown when the data source emits no rows. */
  emptyMessage: string;
  /** Cap the number of rows rendered to this value. */
  max?: number;
} & (
  | {
      supportAddItem?: never;
      search?: never;
      heading?: string;
    }
  | {
      /** Whether to support the add item button. */
      supportAddItem?: ListTemplateAddItemConfig;
      /** Optional client-side search box. */
      search: ListTemplateSearchConfig;
      /** The heading of the list template. This is required when either supportAddItem or search is provided. */
      heading: string;
    }
);

export type NavListTemplateProps<Data = SerializableRecord> = NavExtensionPointBaseComponentProps<
  Data,
  ListTemplateConfig<Data>
>;

function normalizeRows<Data = SerializableRecord>(
  data: Data[] | undefined,
  config: ListTemplateConfig<Data>
): Map<string, NormalizedRow> {
  if (!Array.isArray(data)) {
    return new Map();
  }

  const { item, max } = config;

  return data.reduce((acc, row, index) => {
    const id = getStringField(row, String(item.idField));
    const label = getStringField(row, String(item.labelField));
    const href = getStringField(row, String(item.hrefField));

    if (!id || !label || !href || (typeof max === 'number' && index >= max)) {
      return acc;
    }

    acc.set(id, {
      id,
      index,
      label,
      href,
      iconType: item.iconField ? (getField(row, String(item.iconField)) as IconType) : undefined,
    });

    return acc;
  }, new Map() as Map<string, NormalizedRow>);
}

const listTemplateStyles = {
  get topBarLeftContainer() {
    return css({
      // empty style to allow scoping child styles
    });
  },
  get headingContainerModifier() {
    return css`
      ${this.topBarLeftContainer}[data-search-text-field-open="true"] & {
        display: none;
      }
    `;
  },
};

/**
 * Renders a list of links from an array data source, with optional client-side
 * search and declarative section actions. Field names are read from config.
 */
export function ListTemplate<Data = SerializableRecord>({
  data,
  config,
  context,
}: NavListTemplateProps<Data>): JSX.Element | null {
  const listConfig = config as ListTemplateConfig<Data>;
  const [query, setQuery] = useState<string>('');
  const [searchTextFieldOpen, setSearchTextFieldOpen] = useState(false);
  const popoverRef = useRef<HTMLButtonElement | null>(null);
  const [popoverRowData, setPopoverRowData] = useState<Data | null>(null);

  const rows = useMemo(() => normalizeRows(data, listConfig), [data, listConfig]);

  const filteredRows = useMemo(() => {
    if (!query) return Array.from(rows.values());
    const normalizedQuery = query.toLowerCase();
    return Array.from(rows.values()).filter((row) =>
      row.label.toLowerCase().includes(normalizedQuery)
    );
  }, [rows, query]);

  const onSearchButtonClick = useCallback(() => {
    setSearchTextFieldOpen(true);
  }, [setSearchTextFieldOpen]);

  const renderRowActionPopover = useCallback(() => {
    return popoverRowData ? (
      <EuiWrappingPopover
        button={popoverRef.current!}
        isOpen={popoverRowData !== null}
        closePopover={() => setPopoverRowData(null)}
        panelPaddingSize="none"
        anchorPosition="upLeft"
        aria-label={i18n.translate(
          'sharedUXPackages.navigationExtensionTemplates.listTemplate.actionButtonAriaLabel',
          {
            defaultMessage: 'Open actions menu',
          }
        )}
      >
        <EuiContextMenuPanel
          items={listConfig?.actions?.map((action) => (
            <EuiContextMenuItem
              key={action.id}
              icon={action.icon}
              onClick={action.onClick.bind(null, context.slotId, popoverRowData)}
              data-test-subj={String(`nav-extension-${context.extensionId}-action-${action.id}`)}
            >
              {action.label}
            </EuiContextMenuItem>
          ))}
        />
      </EuiWrappingPopover>
    ) : null;
  }, [context.extensionId, context.slotId, listConfig?.actions, popoverRowData]);

  return (
    <>
      {renderRowActionPopover()}
      <EuiFlexGroup direction="column" gutterSize="m">
        {listConfig.heading && (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem
                css={listTemplateStyles.topBarLeftContainer}
                data-search-text-field-open={searchTextFieldOpen}
              >
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem
                    grow={!searchTextFieldOpen}
                    css={listTemplateStyles.headingContainerModifier}
                  >
                    <EuiText size="s" color="subdued">
                      <h4>{listConfig.heading}</h4>
                    </EuiText>
                  </EuiFlexItem>
                  {listConfig.search?.enabled && (
                    <EuiFlexItem grow={searchTextFieldOpen}>
                      {searchTextFieldOpen ? (
                        <EuiFieldSearch
                          placeholder={listConfig.search.placeholder}
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          data-test-subj={`nav-extension-${context.slotId}-search`}
                          compressed
                          fullWidth
                          isClearable
                        />
                      ) : (
                        <EuiToolTip
                          content={i18n.translate(
                            'sharedUXPackages.navigationExtensionTemplates.listTemplate.toggleSearchFieldTooltip',
                            { defaultMessage: 'Toggle search field' }
                          )}
                          id="toggle-search-field-button"
                        >
                          <EuiButtonIcon
                            color="text"
                            iconType="search"
                            aria-labelledby="toggle-search-field-button"
                            onClick={onSearchButtonClick}
                            disabled={data?.length === 0}
                          />
                        </EuiToolTip>
                      )}
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
              {listConfig.supportAddItem?.enabled && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'sharedUXPackages.navigationExtensionTemplates.listTemplate.addItemButtonTooltip',
                      { defaultMessage: 'Add item' }
                    )}
                    id="add-item-button"
                  >
                    <EuiButtonIcon
                      color="text"
                      iconType="plus"
                      aria-labelledby="add-item-button"
                      onClick={listConfig.supportAddItem.onClick}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiListGroup maxWidth={false}>
              {rows.size === 0 ? (
                <EuiListGroupItem label={listConfig.emptyMessage} />
              ) : (
                filteredRows.map((row) => (
                  <EuiListGroupItem
                    key={row.id}
                    label={row.label}
                    href={row.href}
                    iconType={row.iconType}
                    extraAction={
                      (listConfig?.actions?.length ?? 0) > 0
                        ? {
                            iconType: 'boxesVertical',
                            onClick: (evt) => {
                              evt.preventDefault();
                              popoverRef.current = evt.currentTarget;
                              setPopoverRowData(data[row.index]);
                            },
                            ['data-test-subj']: `nav-extension-${context.slotId}-action-menu-${row.id}`,
                            ['aria-label']: i18n.translate(
                              'sharedUXPackages.navigationExtensionTemplates.listTemplate.actionButtonAriaLabel',
                              {
                                defaultMessage: 'Open actions menu',
                              }
                            ),
                          }
                        : undefined
                    }
                  />
                ))
              )}
            </EuiListGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
