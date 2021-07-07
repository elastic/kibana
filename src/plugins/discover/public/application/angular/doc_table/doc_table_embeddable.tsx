/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { SAMPLE_SIZE_SETTING } from '../../../../common';
import { getServices } from '../../../kibana_services';
import { ToolBarPagerButtons } from './components/pager/tool_bar_pager_buttons';
import { ToolBarPagerText } from './components/pager/tool_bar_pager_text';
import { usePager } from './lib/usePager';
import { CommonDocTableProps } from './doc_table';

interface DocTableEmbeddableProps extends CommonDocTableProps {
  totalHitCount: number;
}

export const DocTableEmbeddable = (props: DocTableEmbeddableProps) => {
  const pager = usePager({ totalItems: props.totalHitCount, pageSize: 50, startingPage: 1 });

  const pageOfItems = useMemo(
    () => props.rows.slice(pager.startIndex, pager.pageSize + pager.startIndex),
    [pager.pageSize, pager.startIndex, props.rows]
  );

  const onPageNext = () => {
    pager.updateMeta({ currentPage: pager.currentPage + 1, totalItems: props.rows.length });
  };

  const onPagePrevious = () => {
    pager.updateMeta({ currentPage: pager.currentPage - 1, totalItems: props.rows.length });
  };

  const shouldShowLimitedResultsWarning = () =>
    !pager.hasNextPage && pager.totalItems < props.totalHitCount;

  const limitedResultsWarning = (
    <FormattedMessage
      id="discover.docTable.limitedSearchResultLabel"
      defaultMessage="Limited to {resultCount} results. Refine your search."
      values={{ resultCount: getServices().uiSettings.get(SAMPLE_SIZE_SETTING, 500) }}
    />
  );

  const pagerToolbar = (
    <div className="kuiBarSection">
      {shouldShowLimitedResultsWarning() && (
        <div className="kuiToolBarText kuiSubduedText">{limitedResultsWarning}</div>
      )}
      <ToolBarPagerText
        startItem={pager.startItem}
        endItem={pager.endItem}
        totalItems={props.totalHitCount}
      />
      <ToolBarPagerButtons
        hasPreviousPage={pager.hasPreviousPage}
        hasNextPage={pager.hasNextPage}
        onPageNext={onPageNext}
        onPagePrevious={onPagePrevious}
      />
    </div>
  );

  return (
    <Fragment>
      <div className="kuiBar kbnDocTable__bar">{pagerToolbar}</div>
      <div className="kbnDocTable__container kbnDocTable__padBottom">
        <table className="kbnDocTable table" ng-if="indexPattern" data-test-subj="docTable">
          <thead>{props.renderHeader()}</thead>
          <tbody>{props.renderRows(pageOfItems)}</tbody>
        </table>
      </div>
      <div className="kuiBar kbnDocTable__bar--footer">{pagerToolbar}</div>
    </Fragment>
  );
};
