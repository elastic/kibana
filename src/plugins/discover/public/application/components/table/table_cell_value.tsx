/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import { IndexPatternField } from '../../../../../data/public';
import { FieldRecord } from './table';
import { trimAngularSpan } from './table_helper';
import { DocViewTableRowBtnCollapse } from './table_row_btn_collapse';
import { DocViewTableRowIconUnderscore } from './table_row_icon_underscore';

const COLLAPSE_LINE_LENGTH = 350;

type TableFieldValueProps = FieldRecord['value'] & {
  fieldName: string;
  fieldMapping: IndexPatternField | undefined;
};

export const TableFieldValue = ({
  formattedField,
  fieldName,
  fieldMapping,
}: TableFieldValueProps) => {
  const [fieldOpen, setFieldOpen] = useState(false);

  const value = trimAngularSpan(String(formattedField));
  const isCollapsible = value.length > COLLAPSE_LINE_LENGTH;
  const isCollapsed = isCollapsible && !fieldOpen;
  const displayUnderscoreWarning = !fieldMapping && fieldName.indexOf('_') === 0;

  const valueClassName = classNames({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    kbnDocViewer__value: true,
    'truncate-by-height': isCollapsible && isCollapsed,
  });

  const onToggleCollapse = useCallback(
    () => setFieldOpen((fieldOpenPrev: boolean) => !fieldOpenPrev),
    []
  );

  return (
    <div>
      {isCollapsible && (
        <DocViewTableRowBtnCollapse onClick={onToggleCollapse} isCollapsed={isCollapsed} />
      )}
      {displayUnderscoreWarning && <DocViewTableRowIconUnderscore />}
      {fieldName ? null : <div className={valueClassName}>{fieldName}:&nbsp;</div>}
      <div
        className={valueClassName}
        data-test-subj={`tableDocViewRow-${fieldName}-value`}
        /*
         * Justification for dangerouslySetInnerHTML:
         * We just use values encoded by our field formatters
         */
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: value as string }}
      />
    </div>
  );
};
