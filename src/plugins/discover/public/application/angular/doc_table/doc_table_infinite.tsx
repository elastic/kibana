/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { debounce } from 'lodash';
import { DocTableRow } from './components/table_row';

interface DocTableInfiniteProps {
  minimumVisibleRows: number;
  rows: DocTableRow[];
  renderRows: (row: DocTableRow[]) => JSX.Element[];
  renderHeader: () => JSX.Element;
}

export const DocTableInfinite = (props: DocTableInfiniteProps) => {
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
      window.addEventListener('scroll', scheduleCheck);
    };
  }, []);

  return (
    <table className="kbn-table table" data-test-subj="docTable">
      <thead>{props.renderHeader()}</thead>
      <tbody>{props.renderRows(props.rows.slice(0, limit))}</tbody>
    </table>
  );
};
