/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './index.scss';
import { FormattedMessage } from '@kbn/i18n-react';
import { debounce } from 'lodash';
import { EuiButtonEmpty } from '@elastic/eui';
import { SAMPLE_SIZE_SETTING } from '../../../common';
import { DocTableProps, DocTableRenderProps, DocTableWrapper } from './doc_table_wrapper';
import { SkipBottomButton } from '../../application/main/components/skip_bottom_button';
import { shouldLoadNextDocPatch } from './lib/should_load_next_doc_patch';
import { useDiscoverServices } from '../../utils/use_discover_services';

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
  limit,
  onSkipBottomButtonClick,
  renderHeader,
  renderRows,
  onSetMaxLimit,
  onBackToTop,
}: DocTableInfiniteContentProps) => {
  const { uiSettings } = useDiscoverServices();

  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING, 500), [uiSettings]);

  const onSkipBottomButton = useCallback(() => {
    onSetMaxLimit();
    onSkipBottomButtonClick();
  }, [onSetMaxLimit, onSkipBottomButtonClick]);

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
    const scrollDiv = tableWrapperRef.current as HTMLDivElement;
    const scrollMobileElem = document.documentElement;

    const scheduleCheck = debounce(() => {
      const isMobileView = document.getElementsByClassName('dscSidebar__mobile').length > 0;

      const usedScrollDiv = isMobileView ? scrollMobileElem : scrollDiv;
      if (shouldLoadNextDocPatch(usedScrollDiv)) {
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
    const focusElem = document.querySelector('.dscSkipButton') as HTMLElement;
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

  return <DocTableWrapperMemoized ref={tableWrapperRef} render={renderDocTable} {...props} />;
};
