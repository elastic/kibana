/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCheckbox,
  EuiContextMenu,
  EuiFieldNumber,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { LogRow, LogSeverity } from './fake_entity_tabs';
import { LogDocumentFlyout } from './log_document_flyout';

interface LogsTabProps {
  readonly entityName: string;
  readonly logs: readonly LogRow[];
}

const SEVERITY_DOT_COLOR: Record<LogSeverity, string> = {
  Info: 'var(--euiColorVis1, #6DCCB1)',
  Warning: 'var(--euiColorWarning, #F5A700)',
  Error: 'var(--euiColorDanger, #BD271E)',
};

const SERVICE_COLORS = [
  'var(--euiColorVis0, #54B399)',
  'var(--euiColorVis1, #6DCCB1)',
  'var(--euiColorVis2, #D36086)',
  'var(--euiColorVis3, #9170B8)',
  'var(--euiColorVis4, #CA8EAE)',
  'var(--euiColorVis5, #D6BF57)',
  'var(--euiColorVis6, #B9A888)',
  'var(--euiColorVis7, #DA8B45)',
  'var(--euiColorVis8, #AA6556)',
  'var(--euiColorVis9, #E7664C)',
];

const serviceColor = (name: string): string => {
  const hash = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return SERVICE_COLORS[hash % SERVICE_COLORS.length];
};

export const LogsTab = ({ entityName, logs }: LogsTabProps) => {
  const { euiTheme } = useEuiTheme();
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionPopoverOpen, setIsSelectionPopoverOpen] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [isColumnsPopoverOpen, setIsColumnsPopoverOpen] = useState(false);
  const [isSortPopoverOpen, setIsSortPopoverOpen] = useState(false);
  const [pinnedSummary, setPinnedSummary] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>(['@timestamp', 'Summary']);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [findIndex, setFindIndex] = useState(0);
  const [isShortcutsPopoverOpen, setIsShortcutsPopoverOpen] = useState(false);
  const [isDisplayPopoverOpen, setIsDisplayPopoverOpen] = useState(false);
  const [expandedDocIndex, setExpandedDocIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [density, setDensity] = useState<'compact' | 'normal' | 'expanded'>('compact');
  const [sampleSize, setSampleSize] = useState(500);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (showSelectedOnly && selectedIds.size > 0) {
      result = result.filter((row) => selectedIds.has(row.id));
    }
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (row) =>
          row.summary.toLowerCase().includes(lower) ||
          row.attribute.toLowerCase().includes(lower) ||
          row.severity.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [logs, searchText, showSelectedOnly, selectedIds]);

  const findMatchCount = useMemo(() => {
    if (!findText.trim()) return 0;
    const lower = findText.toLowerCase();
    return filteredLogs.filter(
      (row) =>
        row.summary.toLowerCase().includes(lower) ||
        row.attribute.toLowerCase().includes(lower) ||
        row.timestamp.toLowerCase().includes(lower)
    ).length;
  }, [filteredLogs, findText]);

  const pageOfItems = useMemo(
    () => filteredLogs.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [filteredLogs, pageIndex, pageSize]
  );

  const allPageSelected = pageOfItems.length > 0 && pageOfItems.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const row of pageOfItems) next.delete(row.id);
      } else {
        for (const row of pageOfItems) next.add(row.id);
      }
      return next;
    });
  }, [allPageSelected, pageOfItems]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo<Array<EuiBasicTableColumn<LogRow>>>(
    () => [
      {
        field: 'id',
        name: (
          <EuiCheckbox
            id="logs-select-all"
            checked={allPageSelected}
            onChange={toggleSelectAll}
            aria-label="Select all"
          />
        ),
        width: '32px',
        render: (id: string) => (
          <EuiCheckbox
            id={`logs-select-${id}`}
            checked={selectedIds.has(id)}
            onChange={() => toggleRow(id)}
            aria-label={`Select row ${id}`}
          />
        ),
      },
      {
        field: 'id',
        name: i18n.translate('entityCentricLabFlyout.flyout.logs.columns.actions', {
          defaultMessage: 'Actions',
        }),
        width: '72px',
        render: (_id: string, row: LogRow) => {
          const idx = filteredLogs.indexOf(row);
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="View details">
                  <EuiButtonIcon
                    iconType="expand"
                    color="text"
                    size="xs"
                    aria-label="View details"
                    onClick={() => setExpandedDocIndex(idx)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="Copy value">
                  <EuiButtonIcon iconType="copyClipboard" color="text" size="xs" aria-label="Copy" />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'timestamp',
        name: i18n.translate('entityCentricLabFlyout.flyout.logs.columns.timestamp', {
          defaultMessage: '@timestamp',
        }),
        width: '200px',
        sortable: true,
        render: (timestamp: string) => (
          <EuiText
            size="xs"
            css={css`
              font-family: ${euiTheme.font.familyCode};
              white-space: nowrap;
            `}
          >
            {timestamp}
          </EuiText>
        ),
      },
      {
        field: 'summary',
        name: i18n.translate('entityCentricLabFlyout.flyout.logs.columns.summary', {
          defaultMessage: 'Summary',
        }),
        render: (_summary: string, row: LogRow) => {
          const dotColor = SEVERITY_DOT_COLOR[row.severity];
          const svcName = extractServiceName(row);
          const svcColor = svcName ? serviceColor(svcName) : undefined;

          return (
            <EuiText
              size="xs"
              css={css`
                font-family: ${euiTheme.font.familyCode};
                line-height: 1.6;
                word-break: break-word;
              `}
            >
              <span
                css={css`
                  display: inline-block;
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: ${dotColor};
                  margin-right: 6px;
                  vertical-align: middle;
                  flex-shrink: 0;
                `}
              />
              {svcName && (
                <EuiBadge
                  color="hollow"
                  css={css`
                    font-size: 10px;
                    line-height: 1;
                    padding: 1px 4px;
                    vertical-align: middle;
                    margin-right: 4px;
                    border-left: 3px solid ${svcColor};
                  `}
                >
                  {svcName}
                </EuiBadge>
              )}
              <span
                css={css`
                  color: ${euiTheme.colors.textSubdued};
                  margin-right: 4px;
                `}
              >
                {row.attribute}
              </span>
              {row.summary}
            </EuiText>
          );
        },
      },
    ],
    [euiTheme, allPageSelected, toggleSelectAll, selectedIds, toggleRow, filteredLogs]
  );

  return (
    <>
      {/* Search + Open in Discover */}
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            placeholder={i18n.translate('entityCentricLabFlyout.flyout.logs.searchPlaceholder', {
              defaultMessage: 'Search for log entries…',
            })}
            value={searchText}
            isClearable
            onChange={handleSearchChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" iconType="popout" iconSide="right" flush="both">
            {i18n.translate('entityCentricLabFlyout.flyout.logs.openInDiscover', {
              defaultMessage: 'Open in Discover',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Toolbar row: doc count + selected + column/sort controls */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('entityCentricLabFlyout.flyout.logs.documentCount', {
                  defaultMessage:
                    '{count} {count, plural, one {document} other {documents}}',
                  values: { count: filteredLogs.length },
                })}
              </EuiText>
            </EuiFlexItem>
            {selectedIds.size > 0 && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiBadge
                      color="primary"
                      onClick={() => setIsSelectionPopoverOpen((prev) => !prev)}
                      onClickAriaLabel="Selection actions"
                      iconType="arrowDown"
                      iconSide="right"
                    >
                      {i18n.translate('entityCentricLabFlyout.flyout.logs.selected', {
                        defaultMessage: '{count} Selected',
                        values: { count: selectedIds.size },
                      })}
                    </EuiBadge>
                  }
                  isOpen={isSelectionPopoverOpen}
                  closePopover={() => setIsSelectionPopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenu
                    size="s"
                    initialPanelId={0}
                    panels={[
                      {
                        id: 0,
                        items: [
                          ...(selectedIds.size >= 2
                            ? [
                                {
                                  name: i18n.translate(
                                    'entityCentricLabFlyout.flyout.logs.actions.compare',
                                    { defaultMessage: 'Compare selected' }
                                  ),
                                  icon: 'inspect',
                                  onClick: () => setIsSelectionPopoverOpen(false),
                                },
                              ]
                            : []),
                          {
                            name: i18n.translate(
                              'entityCentricLabFlyout.flyout.logs.actions.copyText',
                              { defaultMessage: 'Copy selection as text' }
                            ),
                            icon: 'copyClipboard',
                            onClick: () => setIsSelectionPopoverOpen(false),
                          },
                          {
                            name: i18n.translate(
                              'entityCentricLabFlyout.flyout.logs.actions.copyMarkdown',
                              { defaultMessage: 'Copy selection as Markdown' }
                            ),
                            icon: 'copyClipboard',
                            onClick: () => setIsSelectionPopoverOpen(false),
                          },
                          {
                            name: i18n.translate(
                              'entityCentricLabFlyout.flyout.logs.actions.copyJson',
                              { defaultMessage: 'Copy documents as JSON' }
                            ),
                            icon: 'copyClipboard',
                            onClick: () => setIsSelectionPopoverOpen(false),
                          },
                          {
                            name: showSelectedOnly
                              ? i18n.translate(
                                  'entityCentricLabFlyout.flyout.logs.actions.showAll',
                                  { defaultMessage: 'Show all documents' }
                                )
                              : i18n.translate(
                                  'entityCentricLabFlyout.flyout.logs.actions.showSelected',
                                  { defaultMessage: 'Show selected documents only' }
                                ),
                            icon: 'eye',
                            onClick: () => {
                              setShowSelectedOnly((prev) => !prev);
                              setIsSelectionPopoverOpen(false);
                            },
                          },
                          {
                            name: i18n.translate(
                              'entityCentricLabFlyout.flyout.logs.actions.clearSelection',
                              { defaultMessage: 'Clear selection' }
                            ),
                            icon: 'cross',
                            onClick: () => {
                              setSelectedIds(new Set());
                              setShowSelectedOnly(false);
                              setIsSelectionPopoverOpen(false);
                            },
                          },
                        ],
                      },
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButtonEmpty
                    size="xs"
                    iconType="tableDensityExpanded"
                    onClick={() => setIsColumnsPopoverOpen((prev) => !prev)}
                  >
                    {i18n.translate('entityCentricLabFlyout.flyout.logs.columns', {
                      defaultMessage: 'Columns {count}',
                      values: { count: columnOrder.length },
                    })}
                  </EuiButtonEmpty>
                }
                isOpen={isColumnsPopoverOpen}
                closePopover={() => setIsColumnsPopoverOpen(false)}
                panelPaddingSize="s"
                anchorPosition="downRight"
              >
                <EuiPanel
                  hasShadow={false}
                  paddingSize="none"
                  css={css`min-width: 220px;`}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="spaceBetween"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'entityCentricLabFlyout.flyout.logs.columns.pinSummary',
                          { defaultMessage: 'Pin summary' }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        label=""
                        showLabel={false}
                        compressed
                        checked={pinnedSummary}
                        onChange={() => setPinnedSummary((prev) => !prev)}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiHorizontalRule margin="xs" />
                  {columnOrder.map((col) => (
                    <EuiFlexGroup
                      key={col}
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                      css={css`
                        padding: 4px 0;
                        cursor: grab;
                      `}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="grab"
                          color="subdued"
                          size="xs"
                          aria-label={`Drag ${col}`}
                          css={css`cursor: grab;`}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs">{col}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                </EuiPanel>
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButtonEmpty
                    size="xs"
                    iconType="sortable"
                    onClick={() => setIsSortPopoverOpen((prev) => !prev)}
                  >
                    {i18n.translate('entityCentricLabFlyout.flyout.logs.sortFields', {
                      defaultMessage: 'Sort fields {count}',
                      values: { count: 1 },
                    })}
                  </EuiButtonEmpty>
                }
                isOpen={isSortPopoverOpen}
                closePopover={() => setIsSortPopoverOpen(false)}
                panelPaddingSize="s"
                anchorPosition="downRight"
              >
                <EuiPanel
                  hasShadow={false}
                  paddingSize="none"
                  css={css`min-width: 240px;`}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="cross"
                        color="subdued"
                        size="xs"
                        aria-label="Remove sort"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">@timestamp</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="none" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            color={sortDirection === 'asc' ? 'primary' : 'text'}
                            onClick={() => setSortDirection('asc')}
                            css={css`
                              font-weight: ${sortDirection === 'asc' ? 600 : 400};
                              border-bottom: ${sortDirection === 'asc'
                                ? '2px solid var(--euiColorPrimary, #0077CC)'
                                : '2px solid transparent'};
                              border-radius: 0;
                            `}
                          >
                            Old-New
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            color={sortDirection === 'desc' ? 'primary' : 'text'}
                            onClick={() => setSortDirection('desc')}
                            css={css`
                              font-weight: ${sortDirection === 'desc' ? 600 : 400};
                              border-bottom: ${sortDirection === 'desc'
                                ? '2px solid var(--euiColorPrimary, #0077CC)'
                                : '2px solid transparent'};
                              border-radius: 0;
                            `}
                          >
                            New-Old
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="xs" />
                  <EuiButtonEmpty
                    size="xs"
                    flush="left"
                    onClick={() => setIsSortPopoverOpen(false)}
                  >
                    {i18n.translate(
                      'entityCentricLabFlyout.flyout.logs.sort.clear',
                      { defaultMessage: 'Clear sorting' }
                    )}
                  </EuiButtonEmpty>
                </EuiPanel>
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Find in table">
                <EuiButtonIcon
                  iconType="search"
                  color={isFindOpen ? 'primary' : 'text'}
                  size="xs"
                  aria-label="Find in table"
                  onClick={() => {
                    setIsFindOpen((prev) => !prev);
                    if (isFindOpen) {
                      setFindText('');
                      setFindIndex(0);
                    }
                  }}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiToolTip content="Keyboard shortcuts">
                    <EuiButtonIcon
                      iconType="keyboard"
                      color="text"
                      size="xs"
                      aria-label="Keyboard shortcuts"
                      onClick={() => setIsShortcutsPopoverOpen((prev) => !prev)}
                    />
                  </EuiToolTip>
                }
                isOpen={isShortcutsPopoverOpen}
                closePopover={() => setIsShortcutsPopoverOpen(false)}
                panelPaddingSize="m"
                anchorPosition="downRight"
              >
                <EuiPanel
                  hasShadow={false}
                  paddingSize="none"
                  css={css`min-width: 320px;`}
                >
                  <EuiText size="s">
                    <strong>
                      {i18n.translate(
                        'entityCentricLabFlyout.flyout.logs.shortcuts.title',
                        { defaultMessage: 'Keyboard shortcuts' }
                      )}
                    </strong>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <KeyboardShortcutRow keys={['Up arrow']} description="Move one cell up" />
                  <KeyboardShortcutRow keys={['Down arrow']} description="Move one cell down" />
                  <KeyboardShortcutRow keys={['Right arrow']} description="Move one cell right" />
                  <KeyboardShortcutRow keys={['Left arrow']} description="Move one cell left" />
                  <KeyboardShortcutRow keys={['Home']} description="Move to the first cell of the current row" />
                  <KeyboardShortcutRow keys={['End']} description="Move to the last cell of the current row" />
                  <KeyboardShortcutRow keys={['Ctrl', 'Home']} description="Move to the first cell of the current page" />
                  <KeyboardShortcutRow keys={['Ctrl', 'End']} description="Move to the last cell of the current page" />
                  <KeyboardShortcutRow keys={['Page Up']} description="Go to the last row of the previous page" />
                  <KeyboardShortcutRow keys={['Page Down']} description="Go to the first row of the next page" />
                  <KeyboardShortcutRow keys={['Enter']} description="Open cell details and actions" />
                  <KeyboardShortcutRow keys={['Escape']} description="Close cell details and actions" />
                  <KeyboardShortcutRow keys={['Ctrl', 'C']} description="Copy the focused cell value" />
                </EuiPanel>
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiToolTip content="Display options">
                    <EuiButtonIcon
                      iconType="controlsHorizontal"
                      color="text"
                      size="xs"
                      aria-label="Display options"
                      onClick={() => setIsDisplayPopoverOpen((prev) => !prev)}
                    />
                  </EuiToolTip>
                }
                isOpen={isDisplayPopoverOpen}
                closePopover={() => setIsDisplayPopoverOpen(false)}
                panelPaddingSize="m"
                anchorPosition="downRight"
              >
                <EuiPanel
                  hasShadow={false}
                  paddingSize="none"
                  css={css`min-width: 320px;`}
                >
                  {/* View mode */}
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    css={css`padding-bottom: 12px;`}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">View mode</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="accent">NEW</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButtonGroup
                        legend="View mode"
                        options={[
                          { id: 'table', label: 'Table' },
                          { id: 'json', label: 'JSON' },
                        ]}
                        idSelected={viewMode}
                        onChange={(id) => setViewMode(id as 'table' | 'json')}
                        buttonSize="compressed"
                        isFullWidth
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {/* Density */}
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    css={css`padding-bottom: 12px;`}
                  >
                    <EuiFlexItem grow={false} css={css`min-width: 90px;`}>
                      <EuiText size="xs">Density</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButtonGroup
                        legend="Density"
                        options={[
                          { id: 'compact', label: 'Compact' },
                          { id: 'normal', label: 'Normal' },
                          { id: 'expanded', label: 'Expanded' },
                        ]}
                        idSelected={density}
                        onChange={(id) =>
                          setDensity(id as 'compact' | 'normal' | 'expanded')
                        }
                        buttonSize="compressed"
                        isFullWidth
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {/* Max header cell lines */}
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    css={css`padding-bottom: 12px;`}
                  >
                    <EuiFlexItem grow={false} css={css`min-width: 90px;`}>
                      <EuiText size="xs">Max header cell lines</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButtonGroup
                        legend="Max header cell lines"
                        options={[
                          { id: 'header-auto', label: 'Auto' },
                          { id: 'header-custom', label: 'Custom' },
                        ]}
                        idSelected="header-custom"
                        onChange={() => {}}
                        buttonSize="compressed"
                        isFullWidth
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} css={css`width: 50px;`}>
                      <EuiFieldNumber
                        compressed
                        value={3}
                        min={1}
                        max={10}
                        readOnly
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {/* Body cell lines */}
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    css={css`padding-bottom: 12px;`}
                  >
                    <EuiFlexItem grow={false} css={css`min-width: 90px;`}>
                      <EuiText size="xs">Body cell lines</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButtonGroup
                        legend="Body cell lines"
                        options={[
                          { id: 'body-auto', label: 'Auto' },
                          { id: 'body-custom', label: 'Custom' },
                        ]}
                        idSelected="body-custom"
                        onChange={() => {}}
                        buttonSize="compressed"
                        isFullWidth
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} css={css`width: 50px;`}>
                      <EuiFieldNumber
                        compressed
                        value={3}
                        min={1}
                        max={10}
                        readOnly
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {/* Sample size */}
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false} css={css`min-width: 90px;`}>
                      <EuiText size="xs">Sample size</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <input
                        type="range"
                        min={50}
                        max={1000}
                        step={50}
                        value={sampleSize}
                        onChange={(e) => setSampleSize(Number(e.target.value))}
                        css={css`width: 100%;`}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} css={css`width: 50px;`}>
                      <EuiFieldNumber
                        compressed
                        value={sampleSize}
                        min={50}
                        max={1000}
                        onChange={(e) => setSampleSize(Number(e.target.value))}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Find in table bar */}
      {isFindOpen && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder={i18n.translate(
                  'entityCentricLabFlyout.flyout.logs.findPlaceholder',
                  { defaultMessage: 'Find in table' }
                )}
                value={findText}
                onChange={(e) => {
                  setFindText(e.target.value);
                  setFindIndex(0);
                }}
                isClearable
                compressed
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                color="subdued"
                css={css`white-space: nowrap;`}
              >
                {findText.trim()
                  ? `${findMatchCount > 0 ? findIndex + 1 : 0}/${findMatchCount}`
                  : '0/0'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="none" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowUp"
                    color="text"
                    size="xs"
                    aria-label="Previous match"
                    isDisabled={findMatchCount === 0}
                    onClick={() =>
                      setFindIndex((prev) =>
                        prev > 0 ? prev - 1 : Math.max(0, findMatchCount - 1)
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowDown"
                    color="text"
                    size="xs"
                    aria-label="Next match"
                    isDisabled={findMatchCount === 0}
                    onClick={() =>
                      setFindIndex((prev) =>
                        prev < findMatchCount - 1 ? prev + 1 : 0
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    size="xs"
                    aria-label="Close find"
                    onClick={() => {
                      setIsFindOpen(false);
                      setFindText('');
                      setFindIndex(0);
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="s" />

      {/* Log entries table */}
      <div
        css={css`
          .euiTableRow {
            border-bottom: 1px solid ${euiTheme.border.color};
          }
          .euiTableRow:hover {
            background: ${euiTheme.colors.lightestShade};
          }
          .euiTableCellContent {
            padding-top: 6px;
            padding-bottom: 6px;
          }
        `}
      >
        <EuiBasicTable<LogRow>
          items={pageOfItems as LogRow[]}
          columns={columns}
          tableCaption={i18n.translate('entityCentricLabFlyout.flyout.logs.tableCaption', {
            defaultMessage: 'Logs emitted by {entityName}',
            values: { entityName },
          })}
          tableLayout="auto"
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: filteredLogs.length,
            pageSizeOptions: [25, 50, 100],
          }}
          onChange={({ page }: Criteria<LogRow>) => {
            if (page) {
              setPagination({ pageIndex: page.index, pageSize: page.size });
            }
          }}
          data-test-subj="entityCentricLabLogsTable"
        />
      </div>

      <EuiSpacer size="xs" />
      <EuiButtonEmpty size="xs" flush="left" iconType="clock">
        {i18n.translate('entityCentricLabFlyout.flyout.logs.showHistory', {
          defaultMessage: 'Show history',
        })}
      </EuiButtonEmpty>

      {expandedDocIndex !== null && filteredLogs[expandedDocIndex] && (
        <LogDocumentFlyout
          row={filteredLogs[expandedDocIndex]}
          entityName={entityName}
          currentIndex={expandedDocIndex}
          totalCount={filteredLogs.length}
          onClose={() => setExpandedDocIndex(null)}
          onNavigate={(dir) =>
            setExpandedDocIndex((prev) =>
              prev === null
                ? null
                : dir === 'prev'
                ? Math.max(0, prev - 1)
                : Math.min(filteredLogs.length - 1, prev + 1)
            )
          }
        />
      )}
    </>
  );
};

/**
 * Try to extract a recognisable service / component name from the log line to
 * render as a coloured badge (mimics the Infra Logs tab's service-dot pattern).
 */
const extractServiceName = (row: LogRow): string | null => {
  const bracketMatch = row.summary.match(/^\[([A-Za-z][A-Za-z0-9_-]*)\]/);
  if (bracketMatch) return bracketMatch[1];

  if (row.attribute.includes('log.file.path')) {
    const podMatch = row.summary.match(/\/var\/log\/pods\/[^/]*_([a-z][a-z0-9-]*)-/);
    if (podMatch) return podMatch[1];
  }

  return null;
};

const KeyboardShortcutRow = ({
  keys,
  description,
}: {
  readonly keys: readonly string[];
  readonly description: string;
}) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    responsive={false}
    css={css`padding: 3px 0;`}
  >
    <EuiFlexItem
      grow={false}
      css={css`min-width: 120px; text-align: right;`}
    >
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
        {keys.map((key) => (
          <EuiFlexItem key={key} grow={false}>
            <EuiBadge color="hollow">{key}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size="xs">{description}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
