/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ROWS_HEIGHT_OPTIONS,
  type DataGridCellValueElementProps,
  DataGridDensity,
} from '@kbn/unified-data-table';
import React from 'react';
import { EuiButtonIcon, EuiCodeBlock, EuiFlexGroup, EuiText, EuiTitle } from '@elastic/eui';
import {
  ShouldShowFieldInTableHandler,
  getLogDocumentOverview,
  getMessageFieldWithFallbacks,
} from '@kbn/discover-utils';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { Resource } from './resource';
import { Content } from './content';
import {
  closeCellActionPopoverText,
  contentLabel,
  jsonLabel,
  resourceLabel,
} from '../translations';
import { createResourceFields, formatJsonDocumentForContent } from './utils';

export interface SummaryColumnFactoryDeps {
  density: DataGridDensity | undefined;
  rowHeight: number | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  onFilter?: DocViewFilterFn;
}

export type SummaryColumnProps = DataGridCellValueElementProps;

const SummaryColumn = (props: SummaryColumnProps & SummaryColumnFactoryDeps) => {
  const { isDetails } = props;

  if (isDetails) {
    return <SummaryCellPopover {...props} />;
  }

  return <SummaryCell {...props} />;
};

// eslint-disable-next-line import/no-default-export
export default SummaryColumn;

const SummaryCell = ({
  density: maybeNullishDensity,
  rowHeight: maybeNullishRowHeight,
  ...props
}: SummaryColumnProps & SummaryColumnFactoryDeps) => {
  const { onFilter, row } = props;

  const density = maybeNullishDensity ?? DataGridDensity.COMPACT;
  const isCompressed = density === DataGridDensity.COMPACT;

  const rowHeight = maybeNullishRowHeight ?? ROWS_HEIGHT_OPTIONS.single;
  const isSingleLine = rowHeight === ROWS_HEIGHT_OPTIONS.single || rowHeight === 1;

  const resourceFields = createResourceFields(row);
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

const SummaryCellPopover = (props: SummaryColumnProps & SummaryColumnFactoryDeps) => {
  const { row, dataView, fieldFormats, onFilter, closePopover } = props;

  const resourceFields = createResourceFields(row);
  const shouldRenderResource = resourceFields.length > 0;

  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
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
            <span>{resourceLabel}</span>
          </EuiTitle>
          <Resource fields={resourceFields} onFilter={onFilter} />
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
              language="txt"
              fontSize="s"
            >
              {value}
            </EuiCodeBlock>
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
