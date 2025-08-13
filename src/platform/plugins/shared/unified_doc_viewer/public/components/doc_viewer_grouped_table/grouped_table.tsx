/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiNotificationBadge,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import DocViewerTable from '../doc_viewer_table';
import { GroupedTableEmptyPrompt } from './grouped_empty_prompt';

interface GroupBy {
  id: string;
  title: string;
  tooltipMessage?: string;
  hit: DataTableRecord;
}

interface Props extends DocViewRenderProps {
  groups: GroupBy[];
  searchTerm: string;
  onSearchTermChange: (searchTerm: string) => void;
  hideNullValues: boolean;
  onHideNullValuesChange: (hideNullValues: boolean) => void;
}

export function DocViewerGroupedTable({
  columns,
  columnsMeta,
  dataView,
  textBasedHits,
  filter,
  decreaseAvailableHeightBy,
  onAddColumn,
  onRemoveColumn,
  groups,
  searchTerm,
  onSearchTermChange,
  hideNullValues,
  onHideNullValuesChange,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const isEsqlMode = Array.isArray(textBasedHits);

  const noFields = useMemo(
    () =>
      groups.every((group) => {
        return Object.keys(group.hit.flattened).length === 0;
      }),
    [groups]
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" responsive={false} gutterSize="s">
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder={i18n.translate(
                  'unifiedDocViewer.docViewGroupedTable.search.placeholder',
                  {
                    defaultMessage: 'Search field names',
                  }
                )}
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                fullWidth
                compressed
              />
            </EuiFlexItem>
            {isEsqlMode && (
              <EuiFlexItem
                css={css({
                  alignItems: 'flex-end',
                })}
              >
                <EuiSwitch
                  label={i18n.translate(
                    'unifiedDocViewer.docViewGroupedTable.hideNullValues.switchLabel',
                    {
                      defaultMessage: 'Hide null fields',
                      description: 'Switch label to hide fields with null values in the table',
                    }
                  )}
                  checked={hideNullValues}
                  onChange={(e) => {
                    onHideNullValuesChange(e.target.checked);
                  }}
                  compressed
                  data-test-subj="unifiedDocViewerGroupedTableHideNullValuesSwitch"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {noFields ? (
          <EuiFlexItem>
            <GroupedTableEmptyPrompt />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              {groups.map((config) => {
                const hasFields = Object.keys(config.hit.flattened).length > 0;
                return (
                  <EuiFlexItem key={config.id}>
                    <EuiAccordion
                      id={config.id}
                      buttonContent={
                        <EuiText size="s">
                          <strong css={{ marginRight: euiTheme.size.xs }}>{config.title}</strong>
                          {config.tooltipMessage && (
                            <EuiIconTip
                              aria-label={config.tooltipMessage}
                              type="question"
                              color="subdued"
                              size="s"
                              content={config.tooltipMessage}
                              iconProps={{
                                className: 'eui-alignTop',
                              }}
                            />
                          )}
                        </EuiText>
                      }
                      initialIsOpen={hasFields}
                      extraAction={
                        <EuiNotificationBadge size="m" color="subdued">
                          {Object.keys(config.hit.flattened).length}
                        </EuiNotificationBadge>
                      }
                    >
                      {hasFields ? (
                        <DocViewerTable
                          hit={config.hit}
                          dataView={dataView}
                          textBasedHits={textBasedHits}
                          columns={columns}
                          columnsMeta={columnsMeta}
                          filter={filter}
                          decreaseAvailableHeightBy={decreaseAvailableHeightBy}
                          onAddColumn={onAddColumn}
                          onRemoveColumn={onRemoveColumn}
                          hideTableFilters
                          hidePinLeadingControl
                          hidePagination
                        />
                      ) : (
                        <GroupedTableEmptyPrompt />
                      )}
                    </EuiAccordion>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
}
