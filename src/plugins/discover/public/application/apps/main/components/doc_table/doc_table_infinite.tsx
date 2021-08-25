/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, memo, useCallback, useEffect, useState } from 'react';
import './index.scss';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import { EuiButtonEmpty } from '@elastic/eui';
import { DocTableProps, DocTableRenderProps, DocTableWrapper } from './doc_table_wrapper';
import { SkipBottomButton } from '../skip_bottom_button';

const FOOTER_PADDING = { padding: 0 };

const DocTableInfiniteContent = (props: DocTableRenderProps) => {
  const [limit, setLimit] = useState(props.minimumVisibleRows);

  // Reset infinite scroll limit
  useEffect(() => {
    setLimit(props.minimumVisibleRows);
  }, [props.rows, props.minimumVisibleRows]);

  /**
   * depending on which version of Discover is displayed, different elements are scrolling
   * and have therefore to be considered for calculation of infinite scrolling
   */
  useEffect(() => {
    const scrollDiv = document.querySelector('.kbnDocTableWrapper') as HTMLElement;
    const scrollMobileElem = document.documentElement;

    const scheduleCheck = debounce(() => {
      const isMobileView = document.getElementsByClassName('dscSidebar__mobile').length > 0;
      const usedScrollDiv = isMobileView ? scrollMobileElem : scrollDiv;

      const scrollusedHeight = usedScrollDiv.scrollHeight;
      const scrollTop = Math.abs(usedScrollDiv.scrollTop);
      const clientHeight = usedScrollDiv.clientHeight;

      if (scrollTop + clientHeight === scrollusedHeight) {
        setLimit((prevLimit) => prevLimit + 50);
      }
    }, 50);

    scrollDiv.addEventListener('scroll', scheduleCheck);
    window.addEventListener('scroll', scheduleCheck);

    scheduleCheck();

    return () => {
      scrollDiv.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('scroll', scheduleCheck);
    };
  }, []);

  const onBackToTop = useCallback(() => {
    const isMobileView = document.getElementsByClassName('dscSidebar__mobile').length > 0;
    const focusElem = document.querySelector('.dscTable') as HTMLElement;
    focusElem.focus();

    // Only the desktop one needs to target a specific container
    if (!isMobileView) {
      const scrollDiv = document.querySelector('.kbnDocTableWrapper') as HTMLElement;
      scrollDiv.scrollTo(0, 0);
    } else if (window) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <Fragment>
      <SkipBottomButton onClick={props.onSkipBottomButtonClick} />
      <table className="kbn-table table" data-test-subj="docTable">
        <thead>{props.renderHeader()}</thead>
        <tbody>{props.renderRows(props.rows.slice(0, limit))}</tbody>
        <tfoot>
          <tr>
            <td colSpan={(props.columnLength || 1) + 2} style={FOOTER_PADDING}>
              {props.rows.length === props.sampleSize ? (
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
                    values={{ sampleSize: props.sampleSize }}
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

const DocTableWrapperMemoized = memo(DocTableWrapper);
const DocTableInfiniteContentMemoized = memo(DocTableInfiniteContent);

const renderDocTable = (tableProps: DocTableRenderProps) => (
  <DocTableInfiniteContentMemoized {...tableProps} />
);

export const DocTableInfinite = (props: DocTableProps) => {
  return <DocTableWrapperMemoized {...props} render={renderDocTable} />;
};
