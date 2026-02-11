/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataGridDensity, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiCodeBlock, EuiFlexGroup, EuiText, EuiTitle } from '@elastic/eui';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  type ShouldShowFieldInTableHandler,
  TRACE_FIELDS,
  getMessageFieldWithFallbacks,
} from '@kbn/discover-utils';
import { getAvailableTraceFields } from '@kbn/discover-utils/src';
import { escape } from 'lodash';
import { Resource } from './resource';
import { Content } from './content';
import {
  createResourceFields,
  createResourceFieldsWithOtelFallback,
  formatJsonDocumentForContent,
  isTraceDocument,
} from './utils';
import {
  closeCellActionPopoverText,
  contentLabel,
  jsonLabel,
  resourceLabel,
  traceLabel,
} from '../translations';

export interface SummaryColumnFactoryDeps {
  density: DataGridDensity | undefined;
  rowHeight: number | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  onFilter?: DocViewFilterFn;
  core: CoreStart;
  share?: SharePluginStart;
}

export type SummaryColumnProps = DataGridCellValueElementProps & { isTracesSummary?: boolean };
export type AllSummaryColumnProps = SummaryColumnProps & SummaryColumnFactoryDeps;

export const SummaryColumn = (props: AllSummaryColumnProps) => {
  const { isDetails } = props;

  if (isDetails) {
    return <SummaryCellPopover {...props} />;
  }

  return <SummaryCell {...props} />;
};

// eslint-disable-next-line import/no-default-export
export default SummaryColumn;

const DEFAULT_ROW_COUNT = 1;
const SINGLE_ROW_COUNT = 1;

const SummaryCell = ({
  density: maybeNullishDensity,
  rowHeight: maybeNullishRowHeight,
  ...props
}: AllSummaryColumnProps) => {
  const { dataView, onFilter, row, share, core, isTracesSummary, fieldFormats } = props;

  const density = maybeNullishDensity ?? DataGridDensity.COMPACT;
  const isCompressed = density === DataGridDensity.COMPACT;

  const rowHeight = maybeNullishRowHeight ?? DEFAULT_ROW_COUNT;
  const isSingleLine = rowHeight === SINGLE_ROW_COUNT;

  // For logs, also resolve otel field names directly, even if no alias exists
  const resourceFields =
    isTracesSummary && isTraceDocument(row)
      ? createResourceFields({
          row,
          fields: TRACE_FIELDS,
          getAvailableFields: getAvailableTraceFields,
          dataView,
          core,
          share,
          fieldFormats,
        })
      : createResourceFieldsWithOtelFallback({
          row,
          dataView,
          core,
          share,
          fieldFormats,
        });

  const shouldRenderResource = resourceFields.length > 0;

  return isSingleLine ? (
    <EuiFlexGroup gutterSize="s">
      {shouldRenderResource && (
        <Resource
          fields={resourceFields}
          limited={isSingleLine}
          onFilter={onFilter}
          css={singleLineResourceCss}
        />
      )}
      <Content {...props} isCompressed={isCompressed} isSingleLine />
    </EuiFlexGroup>
  ) : (
    <>
      {shouldRenderResource && (
        <Resource
          fields={resourceFields}
          limited={isSingleLine}
          onFilter={onFilter}
          css={multiLineResourceCss}
        />
      )}
      <Content {...props} isCompressed={isCompressed} />
    </>
  );
};

export const SummaryCellPopover = (props: AllSummaryColumnProps) => {
  const { row, dataView, fieldFormats, onFilter, closePopover, share, core, isTracesSummary } =
    props;

  const filterAndClosePopover: AllSummaryColumnProps['onFilter'] = useMemo(() => {
    if (!onFilter) return undefined;

    return (...params) => {
      onFilter(...params);
      closePopover();
    };
  }, [onFilter, closePopover]);

  const isTraceDoc = isTracesSummary && isTraceDocument(row);

  // For logs, also resolve otel field names directly, even if no alias exists
  const resourceFields = isTraceDoc
    ? createResourceFields({
        row,
        fields: TRACE_FIELDS,
        getAvailableFields: getAvailableTraceFields,
        dataView,
        core,
        share,
        fieldFormats,
      })
    : createResourceFieldsWithOtelFallback({
        row,
        dataView,
        core,
        share,
        fieldFormats,
      });

  const shouldRenderResource = resourceFields.length > 0;

  // Use OTel fallback version that returns the actual field name used
  const { field, value, formattedValue } = getMessageFieldWithFallbacks(row.flattened, {
    includeFormattedValue: true,
  });
  const messageCodeBlockProps = formattedValue
    ? { language: 'json', children: formattedValue }
    : { language: 'txt', dangerouslySetInnerHTML: { __html: escape(value ?? '') } };
  const shouldRenderContent = Boolean(field && value);

  const shouldRenderSource = !shouldRenderContent;

  return (
    <EuiFlexGroup direction="column" css={{ position: 'relative', width: 580 }}>
      <EuiButtonIcon
        aria-label={closeCellActionPopoverText}
        data-test-subj="docTableClosePopover"
        iconSize="s"
        iconType="cross"
        size="xs"
        onClick={closePopover}
        css={{ position: 'absolute', right: 0 }}
      />
      {shouldRenderResource && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="xxs">
            <span>{isTraceDoc ? traceLabel : resourceLabel}</span>
          </EuiTitle>
          <Resource fields={resourceFields} onFilter={filterAndClosePopover} />
        </EuiFlexGroup>
      )}
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiTitle size="xxs">
          <span>{contentLabel}</span>
        </EuiTitle>
        {shouldRenderContent && (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiText color="subdued" size="xs">
              {field}
            </EuiText>
            <EuiCodeBlock
              overflowHeight={100}
              paddingSize="s"
              isCopyable
              fontSize="s"
              {...messageCodeBlockProps}
            />
          </EuiFlexGroup>
        )}
        {shouldRenderSource && (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiText color="subdued" size="xs">
              {jsonLabel}
            </EuiText>
            <JsonCodeEditor json={formatJsonDocumentForContent(row).raw} height={300} />
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

const singleLineResourceCss = {
  flexGrow: 0,
  lineHeight: 'normal',
  marginTop: -1,
};

const multiLineResourceCss = { display: 'inline-flex' };
