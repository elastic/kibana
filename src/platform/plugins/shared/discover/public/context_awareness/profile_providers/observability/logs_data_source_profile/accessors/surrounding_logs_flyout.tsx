/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { EsQuerySortValue } from '@kbn/data-plugin/public';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { ProfileProviderServices } from '../../../profile_provider_services';

const DOC_COUNT = 10;
const DEFAULT_VISIBLE_FIELDS = ['@timestamp', 'log.level', 'message'];

const flyoutTitle = i18n.translate('discover.logs.surroundingLogs.flyout.title', {
  defaultMessage: 'Surrounding logs',
});

const columnsButtonLabel = i18n.translate('discover.logs.surroundingLogs.flyout.columnsButton', {
  defaultMessage: 'Columns',
});

const openInContextViewLabel = i18n.translate(
  'discover.logs.surroundingLogs.flyout.openInContextView',
  { defaultMessage: 'Open in context view' }
);

const timestampColumnName = i18n.translate('discover.logs.surroundingLogs.flyout.timestampColumn', {
  defaultMessage: '@timestamp',
});

const levelColumnName = i18n.translate('discover.logs.surroundingLogs.flyout.levelColumn', {
  defaultMessage: 'Level',
});

const messageColumnName = i18n.translate('discover.logs.surroundingLogs.flyout.messageColumn', {
  defaultMessage: 'Message',
});

const errorNoTimeFieldMessage = i18n.translate(
  'discover.logs.surroundingLogs.flyout.errorNoTimeField',
  { defaultMessage: 'This data view has no time field.' }
);

const errorNoTimestampMessage = i18n.translate(
  'discover.logs.surroundingLogs.flyout.errorNoTimestamp',
  { defaultMessage: 'The selected record has no timestamp.' }
);

const errorFetchMessage = i18n.translate('discover.logs.surroundingLogs.flyout.errorFetch', {
  defaultMessage: 'Failed to load surrounding logs.',
});

interface SurroundingLogsState {
  loading: boolean;
  predecessors: DataTableRecord[];
  successors: DataTableRecord[];
  error?: string;
}

function useSurroundingLogs(
  anchor: DataTableRecord,
  dataView: DataView,
  instanceFilter: Filter | undefined,
  services: ProfileProviderServices
): SurroundingLogsState {
  const [state, setState] = useState<SurroundingLogsState>({
    loading: true,
    predecessors: [],
    successors: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchDocs() {
      const timeField = dataView.timeFieldName;
      if (!timeField) {
        setState({ loading: false, predecessors: [], successors: [], error: errorNoTimeFieldMessage });
        return;
      }

      const rawTime = anchor.flattened[timeField];
      const anchorTime = Array.isArray(rawTime) ? rawTime[0] : rawTime;

      if (anchorTime == null) {
        setState({ loading: false, predecessors: [], successors: [], error: errorNoTimestampMessage });
        return;
      }

      try {
        const filters = instanceFilter ? [instanceFilter] : [];
        // Use the anchor's ES sort values as the search_after cursor. Discover fetches records
        // with [@timestamp, _shard_doc] sort, so sort[0] is the timestamp and sort[1] is the
        // _shard_doc tiebreaker. Falling back to [anchorTime, 0] is safe: worst case it
        // slightly mispositions at exact timestamp ties, no worse than a plain range query.
        const anchorSortValues = anchor.raw.sort as [string | number, string | number] | undefined;
        const searchAfter: [string | number, string | number] = [
          anchorSortValues?.[0] ?? (anchorTime as string | number),
          anchorSortValues?.[1] ?? 0,
        ];

        const fetchBatch = async (sortDir: 'asc' | 'desc') => {
          const searchSource = services.data.search.searchSource.createEmpty();
          searchSource
            .setField('index', dataView)
            .setField('size', DOC_COUNT)
            .setField('filter', filters)
            .setField('query', {
              query: {
                bool: {
                  must_not: { ids: { values: [anchor.raw._id!] } },
                },
              },
              language: 'lucene',
            })
            .setField('sort', [
              { [timeField]: sortDir },
              { _shard_doc: sortDir },
            ] as EsQuerySortValue[])
            .setField('searchAfter', searchAfter);

          const { rawResponse } = await lastValueFrom(
            searchSource.fetch$({ disableWarningToasts: true })
          );

          return buildDataTableRecordList({
            records: rawResponse.hits?.hits ?? [],
            dataView,
          });
        };

        const [predecessors, successors] = await Promise.all([
          fetchBatch('desc'),
          fetchBatch('asc'),
        ]);

        if (!cancelled) {
          setState({
            loading: false,
            // slice() before reverse() to avoid mutating the array returned by fetchBatch
            predecessors: predecessors.slice().reverse(),
            successors,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState({ loading: false, predecessors: [], successors: [], error: errorFetchMessage });
        }
      }
    }

    fetchDocs();
    return () => {
      cancelled = true;
    };
  // Intentionally empty: fetch is a one-shot operation on mount; anchor/dataView/instanceFilter
  // are stable for the lifetime of this flyout instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function buildColumn(fieldName: string) {
  const getValue = (record: DataTableRecord) => {
    const raw = record.flattened[fieldName];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  if (fieldName === '@timestamp') {
    return {
      field: `flattened.${fieldName}`,
      name: timestampColumnName,
      width: '220px',
      render: (_: unknown, record: DataTableRecord) => {
        const val = getValue(record);
        return <EuiText size="xs">{val != null ? String(val) : ''}</EuiText>;
      },
    };
  }

  if (fieldName === 'log.level') {
    return {
      field: `flattened.${fieldName}`,
      name: levelColumnName,
      width: '80px',
      render: (_: unknown, record: DataTableRecord) => {
        const val = getValue(record);
        return val ? <EuiBadge>{String(val)}</EuiBadge> : null;
      },
    };
  }

  return {
    field: `flattened.${fieldName}`,
    name: fieldName === 'message' ? messageColumnName : fieldName,
    render: (_: unknown, record: DataTableRecord) => {
      const val = getValue(record);
      return val != null ? <EuiText size="xs">{String(val)}</EuiText> : null;
    },
  };
}

export const SurroundingLogsFlyoutContent = ({
  anchor,
  dataView,
  instanceFilter,
  services,
  onClose,
}: {
  anchor: DataTableRecord;
  dataView: DataView;
  instanceFilter: Filter | undefined;
  services: ProfileProviderServices;
  onClose: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { loading, predecessors, successors, error } = useSurroundingLogs(
    anchor,
    dataView,
    instanceFilter,
    services
  );

  const [visibleFields, setVisibleFields] = useState(DEFAULT_VISIBLE_FIELDS);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const allDataViewFields = useMemo(
    () =>
      dataView.fields
        .getAll()
        .filter((f) => f.type !== '_source')
        .map((f) => f.name)
        .sort(),
    [dataView]
  );

  const selectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      allDataViewFields.map((name) => ({
        label: name,
        checked: visibleFields.includes(name) ? ('on' as const) : undefined,
      })),
    [allDataViewFields, visibleFields]
  );

  const onFieldsChange = useCallback((options: EuiSelectableOption[]) => {
    setVisibleFields(options.filter((o) => o.checked === 'on').map((o) => o.label));
  }, []);

  const onOpenContextView = useCallback(
    (record: DataTableRecord) => {
      if (!record.raw._id) return;
      onClose();
      const dataViewId = dataView.id ?? dataView.title;
      // DataViewSpec is serializable; a full DataView object contains FieldFormat class
      // instances that cannot be cloned by pushState.
      const index = dataView.isPersisted() ? dataViewId : dataView.toSpec();
      // Include the current time range so the referrer URL restores it when the user goes back.
      const timeRange = services.data.query.timefilter.timefilter.getTime();
      services.locator
        .getUrl({ dataViewId, timeRange })
        .then((referrer) =>
          services.contextLocator.navigate({
            index,
            rowId: record.raw._id!,
            columns: visibleFields,
            filters: instanceFilter ? [instanceFilter] : [],
            referrer,
          })
        );
    },
    [dataView, instanceFilter, onClose, services, visibleFields]
  );

  const tableColumns = useMemo(
    () => [
      ...visibleFields.map(buildColumn),
      {
        name: '',
        width: '40px',
        actions: [
          {
            name: openInContextViewLabel,
            description: openInContextViewLabel,
            type: 'icon' as const,
            icon: 'popout',
            onClick: onOpenContextView,
          },
        ],
      },
    ],
    [visibleFields, onOpenContextView]
  );

  const allRows = useMemo(() => {
    const anchorRow: DataTableRecord = { ...anchor, isAnchor: true };
    return [...predecessors, anchorRow, ...successors];
  }, [anchor, predecessors, successors]);

  const rowProps = useCallback(
    (record: DataTableRecord) =>
      record.isAnchor
        ? { style: { backgroundColor: euiTheme.colors.highlight, fontWeight: 'bold' } }
        : {},
    [euiTheme.colors.highlight]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="surroundingLogsFlyoutTitle">{flyoutTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonEmpty
                  size="xs"
                  iconType="listAdd"
                  onClick={() => setIsPickerOpen((open) => !open)}
                >
                  {columnsButtonLabel}
                </EuiButtonEmpty>
              }
              isOpen={isPickerOpen}
              closePopover={() => setIsPickerOpen(false)}
              panelPaddingSize="none"
            >
              <EuiSelectable searchable options={selectableOptions} onChange={onFieldsChange}>
                {(list, search) => (
                  <div style={{ width: 300 }}>
                    {search}
                    {list}
                  </div>
                )}
              </EuiSelectable>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading && <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />}
        {!loading && error && (
          <EuiEmptyPrompt iconType="error" color="danger" title={<h2>{error}</h2>} />
        )}
        {!loading && !error && (
          <EuiBasicTable<DataTableRecord>
            itemId="id"
            items={allRows}
            columns={tableColumns}
            rowProps={rowProps}
            tableLayout="auto"
          />
        )}
      </EuiFlyoutBody>
    </>
  );
};
