/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { MAX_LOADED_GRID_ROWS } from '../../../common/constants';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface DiscoverGridFooterProps {
  isLoadingMore?: boolean;
  rowCount: number;
  sampleSize: number;
  pageIndex?: number; // starts from 0
  pageCount: number;
  totalHits?: number;
  onFetchMoreRecords?: () => void;
}

export const DiscoverGridFooter: React.FC<DiscoverGridFooterProps> = (props) => {
  const {
    isLoadingMore,
    rowCount,
    sampleSize,
    pageIndex,
    pageCount,
    totalHits = 0,
    onFetchMoreRecords,
  } = props;
  const { data } = useDiscoverServices();
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

  // allow to fetch more records on Discover page
  if (onFetchMoreRecords && typeof isLoadingMore === 'boolean') {
    if (rowCount <= MAX_LOADED_GRID_ROWS - sampleSize) {
      return (
        <DiscoverGridFooterContainer hasButton={true} {...props}>
          <EuiToolTip
            content={
              isRefreshIntervalOn
                ? i18n.translate('discover.gridSampleSize.fetchMoreLinkDisabledTooltip', {
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
                id="discover.gridSampleSize.fetchMoreLinkLabel"
                defaultMessage="Load more"
              />
            </EuiButtonEmpty>
          </EuiToolTip>
        </DiscoverGridFooterContainer>
      );
    }

    return <DiscoverGridFooterContainer hasButton={false} {...props} />;
  }

  if (rowCount < totalHits) {
    // show only a message for embeddable
    return <DiscoverGridFooterContainer hasButton={false} {...props} />;
  }

  return null;
};

interface DiscoverGridFooterContainerProps extends DiscoverGridFooterProps {
  hasButton: boolean;
}

const DiscoverGridFooterContainer: React.FC<DiscoverGridFooterContainerProps> = ({
  hasButton,
  rowCount,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fieldFormats } = useDiscoverServices();

  const formattedRowCount = fieldFormats
    .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
    .convert(rowCount);

  return (
    <p
      data-test-subj="discoverTableFooter"
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
            id="discover.gridSampleSize.lastPageDescription"
            defaultMessage="Search results are limited to {rowCount} documents."
            values={{
              rowCount: formattedRowCount,
            }}
          />
        ) : (
          <FormattedMessage
            id="discover.gridSampleSize.limitDescription"
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
