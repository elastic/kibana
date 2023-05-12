/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import classnames from 'classnames';
import { EuiButtonEmpty } from '@elastic/eui';

export interface DiscoverGridFooterProps {
  isLoadingMore: boolean;
  rowCount: number;
  sampleSize: number;
  pageIndex?: number;
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
  const isOnLastPage = pageIndex === pageCount - 1 && rowCount < totalHits;

  if (!isOnLastPage) {
    return null;
  }

  // allow to fetch more records on Discover page
  if (onFetchMoreRecords) {
    // TODO: define a limit
    if (rowCount <= 3000 - sampleSize) {
      return (
        <DiscoverGridFooterContainer hasButton={true} {...props}>
          <>
            {' '}
            <EuiButtonEmpty
              isLoading={isLoadingMore}
              flush="both"
              data-test-subj="dscGridSampleSizeFetchMoreLink"
              onClick={onFetchMoreRecords}
            >
              <FormattedMessage
                id="discover.gridSampleSize.fetchMoreLinkLabel"
                defaultMessage="Load {sampleSize} more"
                values={{
                  sampleSize,
                }}
              />
            </EuiButtonEmpty>
          </>
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
  return (
    <p
      className={classnames('dscDiscoverGrid__footer', {
        'dscDiscoverGrid__footer--withButton': hasButton,
      })}
      data-test-subj="discoverTableFooter"
    >
      {hasButton ? (
        <FormattedMessage
          id="discover.gridSampleSize.lastPageDescription"
          defaultMessage="Search results are limited to {rowCount} documents."
          values={{
            rowCount,
          }}
        />
      ) : (
        <FormattedMessage
          id="discover.gridSampleSize.limitDescription"
          defaultMessage="Search results are limited to {sampleSize} documents. Add more search terms to narrow your search."
          values={{
            sampleSize: rowCount,
          }}
        />
      )}
      {children}
    </p>
  );
};
