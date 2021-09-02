/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, memo, useCallback, useEffect, useRef, useState } from 'react';
import './index.scss';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import { EuiButtonEmpty } from '@elastic/eui';
import { DocTableProps, DocTableRenderProps, DocTableWrapper } from './doc_table_wrapper';
import { SkipBottomButton } from '../skip_bottom_button';

const FOOTER_PADDING = { padding: 0 };

const DocTableWrapperMemoized = memo(DocTableWrapper);

interface DocTableInfiniteContentProps extends DocTableRenderProps {
  limit: number;
  onSetMaxLimit: () => void;
  onBackToTop: () => void;
}

const DocTableInfiniteContent = ({
  rows,
  columnLength,
  sampleSize,
  limit,
  onSkipBottomButtonClick,
  renderHeader,
  renderRows,
  onSetMaxLimit,
  onBackToTop,
}: DocTableInfiniteContentProps) => {
  const onSkipBottomButton = useCallback(() => {
    onSetMaxLimit();
    onSkipBottomButtonClick();
  }, [onSetMaxLimit, onSkipBottomButtonClick]);

  // eslint-disable-next-line no-console
  console.log('RENDER table');

  return (
    <Fragment>
      <SkipBottomButton onClick={onSkipBottomButton} />
      <table className="kbn-table table" data-test-subj="docTable">
        <thead>{renderHeader()}</thead>
        <tbody>{renderRows(rows.slice(0, limit))}</tbody>
        <tfoot>
          <tr>
            <td colSpan={(columnLength || 1) + 2} style={FOOTER_PADDING}>
              {rows.length === sampleSize ? (
                <div
                  className="kbnDocTable__footer"
                  data-test-subj="discoverDocTableFooter"
                  tabIndex={-1}
                  id="discoverBottomMarker"
                >
                  <FormattedMessage
                    id="discover.howToSeeOtherMatchingDocumentsDescription"
                    defaultMessage="These are the first {sampleSize} documents matching
your search, refine your search to see others."
                    values={{ sampleSize }}
                  />
                  <EuiButtonEmpty onClick={onBackToTop} data-test-subj="discoverBackToTop">
                    <FormattedMessage
                      id="discover.backToTopLinkText"
                      defaultMessage="Back to top."
                    />
                  </EuiButtonEmpty>
                </div>
              ) : (
                <span tabIndex={-1} id="discoverBottomMarker">
                  &#8203;
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </Fragment>
  );
};

export const DocTableInfinite = (props: DocTableProps) => {
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(50);

  /**
   * depending on which version of Discover is displayed, different elements are scrolling
   * and have therefore to be considered for calculation of infinite scrolling
   */
  useEffect(() => {
    // After mounting table wrapper should be initialized
    const scrollDesktopElem = tableWrapperRef.current as HTMLDivElement;
    const scrollMobileElem = document.documentElement;

    const scheduleCheck = debounce(() => {
      const isMobileView = document.getElementsByClassName('dscSidebar__mobile').length > 0;
      const usedScrollDiv = isMobileView ? scrollMobileElem : scrollDesktopElem;

      const scrollusedHeight = usedScrollDiv.scrollHeight;
      const scrollTop = Math.abs(usedScrollDiv.scrollTop);
      const clientHeight = usedScrollDiv.clientHeight;

      // eslint-disable-next-line no-console
      console.log('checking');
      if (scrollTop + clientHeight === scrollusedHeight) {
        // eslint-disable-next-line no-console
        console.log('setting limit');
        setLimit((prevLimit) => prevLimit + 50);
      }
    }, 50);

    // eslint-disable-next-line no-console
    console.log('adding event listener', scrollDesktopElem);
    scrollDesktopElem.addEventListener('scroll', scheduleCheck);
    window.addEventListener('scroll', scheduleCheck);

    scheduleCheck();

    return () => {
      scrollDesktopElem.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('scroll', scheduleCheck);
    };
  }, []);

  const onBackToTop = useCallback(() => {
    const isMobileView = document.getElementsByClassName('dscSidebar__mobile').length > 0;
    const focusElem = document.querySelector('.dscTable') as HTMLElement;
    focusElem.focus();

    // Only the desktop one needs to target a specific container
    if (!isMobileView && tableWrapperRef.current) {
      tableWrapperRef.current.scrollTo(0, 0);
    } else if (window) {
      window.scrollTo(0, 0);
    }
  }, []);

  const setMaxLimit = useCallback(() => setLimit(props.rows.length), [props.rows.length]);

  const renderDocTable = useCallback(
    (tableProps: DocTableRenderProps) => (
      <DocTableInfiniteContent
        {...tableProps}
        limit={limit}
        onSetMaxLimit={setMaxLimit}
        onBackToTop={onBackToTop}
      />
    ),
    [limit, onBackToTop, setMaxLimit]
  );

  // eslint-disable-next-line no-console
  console.log('RENDER WRAPPER9');

  return <DocTableWrapperMemoized ref={tableWrapperRef} render={renderDocTable} {...props} />;
};
