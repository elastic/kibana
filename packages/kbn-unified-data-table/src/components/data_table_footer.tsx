/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, FC, PropsWithChildren } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { MAX_LOADED_GRID_ROWS } from '../constants';

export interface UnifiedDataTableFooterProps {
  isLoadingMore?: boolean;
  rowCount: number;
  sampleSize: number;
  pageIndex?: number; // starts from 0
  pageCount: number;
  totalHits?: number;
  onFetchMoreRecords?: () => void;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
}

export const UnifiedDataTableFooter: FC<PropsWithChildren<UnifiedDataTableFooterProps>> = (
  props
) => {
  const {
    isLoadingMore,
    rowCount,
    sampleSize,
    pageIndex,
    pageCount,
    totalHits = 0,
    onFetchMoreRecords,
    data,
  } = props;
  const timefilter = data.query.timefilter.timefilter;
  const [refreshInterval, setRefreshInterval] = useState(timefilter.getRefreshInterval());

  useEffect(() => {
    const subscriber = timefilter.getRefreshIntervalUpdate$().subscribe(() => {
      setRefreshInterval(timefilter.getRefreshInterval());
    });

    return () => subscriber.unsubscribe();
  }, [timefilter, setRefreshInterval]);

  const isRefreshIntervalOn = Boolean(
    refreshInterval && refreshInterval.pause === false && refreshInterval.value > 0
  );

  const { euiTheme } = useEuiTheme();
  const isOnLastPage = pageIndex === pageCount - 1 && rowCount < totalHits;

  if (!isOnLastPage) {
    return null;
  }

  // allow to fetch more records for UnifiedDataTable
  if (onFetchMoreRecords && typeof isLoadingMore === 'boolean') {
    if (rowCount <= MAX_LOADED_GRID_ROWS - sampleSize) {
      return (
        <UnifiedDataTableFooterContainer hasButton={true} {...props}>
          <EuiToolTip
            content={
              isRefreshIntervalOn
                ? i18n.translate('unifiedDataTable.gridSampleSize.fetchMoreLinkDisabledTooltip', {
                    defaultMessage: 'To load more the refresh interval needs to be disabled first',
                  })
                : undefined
            }
          >
            <EuiButtonEmpty
              disabled={isRefreshIntervalOn}
              isLoading={isLoadingMore}
              flush="both"
              data-test-subj="dscGridSampleSizeFetchMoreLink"
              onClick={onFetchMoreRecords}
              css={css`
                margin-left: ${euiTheme.size.xs};
              `}
            >
              <FormattedMessage
                id="unifiedDataTable.gridSampleSize.fetchMoreLinkLabel"
                defaultMessage="Load more"
              />
            </EuiButtonEmpty>
          </EuiToolTip>
        </UnifiedDataTableFooterContainer>
      );
    }

    return <UnifiedDataTableFooterContainer hasButton={false} {...props} />;
  }

  if (rowCount < totalHits) {
    // show only a message for embeddable
    return <UnifiedDataTableFooterContainer hasButton={false} {...props} />;
  }

  return null;
};

interface UnifiedDataTableFooterContainerProps extends UnifiedDataTableFooterProps {
  hasButton: boolean;
}

const UnifiedDataTableFooterContainer: React.FC<
  React.PropsWithChildren<UnifiedDataTableFooterContainerProps>
> = ({ hasButton, rowCount, children, fieldFormats }) => {
  const { euiTheme } = useEuiTheme();

  const formattedRowCount = fieldFormats
    .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
    .convert(rowCount);

  return (
    <p
      data-test-subj="unifiedDataTableFooter"
      css={css`
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background-color: ${euiTheme.colors.lightestShade};
        padding: ${hasButton
          ? `0 ${euiTheme.size.base}`
          : `${euiTheme.size.s} ${euiTheme.size.base}`};
        margin-top: ${euiTheme.size.xs};
        text-align: center;
      `}
    >
      <span>
        {hasButton ? (
          <FormattedMessage
            id="unifiedDataTable.gridSampleSize.lastPageDescription"
            defaultMessage="Search results are limited to {rowCount} documents."
            values={{
              rowCount: formattedRowCount,
            }}
          />
        ) : (
          <FormattedMessage
            id="unifiedDataTable.gridSampleSize.limitDescription"
            defaultMessage="Search results are limited to {sampleSize} documents. Add more search terms to narrow your search."
            values={{
              sampleSize: formattedRowCount,
            }}
          />
        )}
      </span>
      {children}
    </p>
  );
};
