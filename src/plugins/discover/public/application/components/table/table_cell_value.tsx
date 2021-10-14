/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { Fragment, useState } from 'react';
import { IgnoredReason } from '../../helpers/get_ignored_reason';
import { FieldRecord } from './table';
import { DocViewTableRowBtnCollapse } from './table_row_btn_collapse';

const COLLAPSE_LINE_LENGTH = 350;

type TableFieldValueProps = Pick<FieldRecord['field'], 'field'> & {
  formattedValue: FieldRecord['value']['formattedValue'];
  rawValue: unknown;
  ignoreReason?: IgnoredReason;
};

export const TableFieldValue = ({
  formattedValue,
  field,
  rawValue,
  ignoreReason,
}: TableFieldValueProps) => {
  const [fieldOpen, setFieldOpen] = useState(false);

  const value = String(formattedValue);
  const isCollapsible = value.length > COLLAPSE_LINE_LENGTH;
  const isCollapsed = isCollapsible && !fieldOpen;

  const valueClassName = classNames({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    kbnDocViewer__value: true,
    'truncate-by-height': isCollapsible && isCollapsed,
  });

  const onToggleCollapse = () => setFieldOpen((fieldOpenPrev) => !fieldOpenPrev);

  const multiValue = Array.isArray(rawValue) && rawValue.length > 1;

  return (
    <Fragment>
      {isCollapsible && (
        <DocViewTableRowBtnCollapse onClick={onToggleCollapse} isCollapsed={isCollapsed} />
      )}
      {ignoreReason && (
        <em>
          {ignoreReason.toString()} (multiValue: {String(multiValue)})
        </em>
      )}
      <div
        className={valueClassName}
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
