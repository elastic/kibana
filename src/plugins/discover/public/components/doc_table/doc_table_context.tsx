/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import './index.scss';
import { SkipBottomButton } from '../../application/main/components/skip_bottom_button';
import { DocTableProps, DocTableRenderProps, DocTableWrapper } from './doc_table_wrapper';

const DocTableWrapperMemoized = React.memo(DocTableWrapper);

const renderDocTable = (tableProps: DocTableRenderProps) => {
  return (
    <Fragment>
      <SkipBottomButton onClick={tableProps.onSkipBottomButtonClick} />
      <table className="kbn-table table" data-test-subj="docTable">
        <thead>{tableProps.renderHeader()}</thead>
        <tbody>{tableProps.renderRows(tableProps.rows)}</tbody>
      </table>
      <span tabIndex={-1} id="discoverBottomMarker">
        &#8203;
      </span>
    </Fragment>
  );
};

export const DocTableContext = (props: DocTableProps) => {
  return <DocTableWrapperMemoized {...props} render={renderDocTable} />;
};
