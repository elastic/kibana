/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useState } from 'react';
import { getTruncateStyles } from '../../helpers/truncate_styles';
import { FieldRecord } from './table';
import { DocViewTableRowBtnCollapse } from './table_row_btn_collapse';

const COLLAPSE_LINE_LENGTH = 350;

type TableFieldValueProps = FieldRecord['value'] & Pick<FieldRecord['field'], 'field'>;

export const TableFieldValue = ({ maxHeight, formattedValue, field }: TableFieldValueProps) => {
  const [fieldOpen, setFieldOpen] = useState(false);

  const value = String(formattedValue);
  const isCollapsible = value.length > COLLAPSE_LINE_LENGTH;
  const isCollapsed = isCollapsible && !fieldOpen;

  const onToggleCollapse = () => setFieldOpen((fieldOpenPrev) => !fieldOpenPrev);

  return (
    <Fragment>
      {isCollapsible && (
        <DocViewTableRowBtnCollapse onClick={onToggleCollapse} isCollapsed={isCollapsed} />
      )}
      <div
        className="kbnDocViewer__value"
        css={isCollapsed && getTruncateStyles(maxHeight)}
        data-test-subj={`tableDocViewRow-${field}-value`}
        /*
         * Justification for dangerouslySetInnerHTML:
         * We just use values encoded by our field formatters
         */
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </Fragment>
  );
};
