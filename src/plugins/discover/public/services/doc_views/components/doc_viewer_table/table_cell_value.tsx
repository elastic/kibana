/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTextColor, EuiToolTip } from '@elastic/eui';
import classNames from 'classnames';
import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { IgnoredReason } from '../../../../utils/get_ignored_reason';
import { FieldRecord } from './table';
import { DocViewTableRowBtnCollapse } from './legacy/table_row_btn_collapse';

const COLLAPSE_LINE_LENGTH = 350;

interface IgnoreWarningProps {
  reason: IgnoredReason;
  rawValue: unknown;
}

const IgnoreWarning: React.FC<IgnoreWarningProps> = React.memo(({ rawValue, reason }) => {
  const multiValue = Array.isArray(rawValue) && rawValue.length > 1;

  const getToolTipContent = (): string => {
    switch (reason) {
      case IgnoredReason.IGNORE_ABOVE:
        return multiValue
          ? i18n.translate('discover.docView.table.ignored.multiAboveTooltip', {
              defaultMessage: `One or more values in this field are too long and can't be searched or filtered.`,
            })
          : i18n.translate('discover.docView.table.ignored.singleAboveTooltip', {
              defaultMessage: `The value in this field is too long and can't be searched or filtered.`,
            });
      case IgnoredReason.MALFORMED:
        return multiValue
          ? i18n.translate('discover.docView.table.ignored.multiMalformedTooltip', {
              defaultMessage: `This field has one or more malformed values that can't be searched or filtered.`,
            })
          : i18n.translate('discover.docView.table.ignored.singleMalformedTooltip', {
              defaultMessage: `The value in this field is malformed and can't be searched or filtered.`,
            });
      case IgnoredReason.UNKNOWN:
        return multiValue
          ? i18n.translate('discover.docView.table.ignored.multiUnknownTooltip', {
              defaultMessage: `One or more values in this field were ignored by Elasticsearch and can't be searched or filtered.`,
            })
          : i18n.translate('discover.docView.table.ignored.singleUnknownTooltip', {
              defaultMessage: `The value in this field was ignored by Elasticsearch and can't be searched or filtered.`,
            });
    }
  };

  return (
    <EuiToolTip content={getToolTipContent()}>
      <EuiFlexGroup
        gutterSize="xs"
        responsive={false}
        alignItems="center"
        css={css`
          cursor: help;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="alert" color="warning" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTextColor color="warning">
            {multiValue
              ? i18n.translate('discover.docViews.table.ignored.multiValueLabel', {
                  defaultMessage: 'Contains ignored values',
                })
              : i18n.translate('discover.docViews.table.ignored.singleValueLabel', {
                  defaultMessage: 'Ignored value',
                })}
          </EuiTextColor>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
});

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

  const value = String(rawValue);
  const isCollapsible = value.length > COLLAPSE_LINE_LENGTH;
  const isCollapsed = isCollapsible && !fieldOpen;

  const valueClassName = classNames({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    kbnDocViewer__value: true,
    dscTruncateByHeight: isCollapsible && isCollapsed,
  });

  const onToggleCollapse = () => setFieldOpen((fieldOpenPrev) => !fieldOpenPrev);

  return (
    <Fragment>
      {(isCollapsible || ignoreReason) && (
        <EuiFlexGroup gutterSize="s">
          {isCollapsible && (
            <EuiFlexItem grow={false}>
              <DocViewTableRowBtnCollapse onClick={onToggleCollapse} isCollapsed={isCollapsed} />
            </EuiFlexItem>
          )}
          {ignoreReason && (
            <EuiFlexItem grow={false}>
              <IgnoreWarning reason={ignoreReason} rawValue={rawValue} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
      <div
        className={valueClassName}
        data-test-subj={`tableDocViewRow-${field}-value`}
        // Value returned from formatFieldValue is always sanitized
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: formattedValue }}
      />
    </Fragment>
  );
};
