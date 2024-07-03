/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import classNames from 'classnames';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { IgnoredReason, TRUNCATE_MAX_HEIGHT } from '@kbn/discover-utils';
import { FieldRecord } from './table';
import { getUnifiedDocViewerServices } from '../../plugin';

const COLLAPSE_LINE_LENGTH = 350;

// Keep in memory what field values were expanded by the user and restore this state when the user opens DocViewer again
const expandedFieldValuesSet = new Set<string>();

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
          ? i18n.translate('unifiedDocViewer.docView.table.ignored.multiAboveTooltip', {
              defaultMessage: `One or more values in this field are too long and can't be searched or filtered.`,
            })
          : i18n.translate('unifiedDocViewer.docView.table.ignored.singleAboveTooltip', {
              defaultMessage: `The value in this field is too long and can't be searched or filtered.`,
            });
      case IgnoredReason.MALFORMED:
        return multiValue
          ? i18n.translate('unifiedDocViewer.docView.table.ignored.multiMalformedTooltip', {
              defaultMessage: `This field has one or more malformed values that can't be searched or filtered.`,
            })
          : i18n.translate('unifiedDocViewer.docView.table.ignored.singleMalformedTooltip', {
              defaultMessage: `The value in this field is malformed and can't be searched or filtered.`,
            });
      case IgnoredReason.UNKNOWN:
        return multiValue
          ? i18n.translate('unifiedDocViewer.docView.table.ignored.multiUnknownTooltip', {
              defaultMessage: `One or more values in this field were ignored by Elasticsearch and can't be searched or filtered.`,
            })
          : i18n.translate('unifiedDocViewer.docView.table.ignored.singleUnknownTooltip', {
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
          <EuiIcon type="warning" color="warning" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTextColor color="warning">
            {multiValue
              ? i18n.translate('unifiedDocViewer.docViews.table.ignored.multiValueLabel', {
                  defaultMessage: 'Contains ignored values',
                })
              : i18n.translate('unifiedDocViewer.docViews.table.ignored.singleValueLabel', {
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
  const { uiSettings } = getUnifiedDocViewerServices();
  const truncateMaxHeight = uiSettings.get(TRUNCATE_MAX_HEIGHT);

  const valueRef = useRef<HTMLDivElement>(null);
  const [collapsedScrollHeight, setCollapsedScrollHeight] = useState<number>(0);

  const [isValueExpanded, setIsValueExpanded] = useState(expandedFieldValuesSet.has(field));
  const isCollapsible =
    truncateMaxHeight > 0 &&
    String(rawValue).length > COLLAPSE_LINE_LENGTH &&
    // Don't collapse if the field value fits into the available height anyway (when the screen width is large enough)
    (!collapsedScrollHeight || collapsedScrollHeight > truncateMaxHeight);
  const isCollapsed = isCollapsible && !isValueExpanded;

  const valueClassName = classNames({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    kbnDocViewer__value: true,
    dscTruncateByHeight: isCollapsible && isCollapsed,
  });

  const onToggleCollapse = useCallback(
    () =>
      setIsValueExpanded((isExpandedPrev) => {
        const isExpandedNext = !isExpandedPrev;
        if (isExpandedNext) {
          expandedFieldValuesSet.add(field);
        } else {
          expandedFieldValuesSet.delete(field);
        }
        return isExpandedNext;
      }),
    [field, setIsValueExpanded]
  );

  useEffect(() => {
    if (isCollapsible && isCollapsed && valueRef.current?.scrollHeight) {
      setCollapsedScrollHeight(valueRef.current.scrollHeight);
    }
  }, [isCollapsible, isCollapsed, setCollapsedScrollHeight]);

  return (
    <Fragment>
      {ignoreReason && (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <IgnoreWarning reason={ignoreReason} rawValue={rawValue} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup gutterSize="s" direction="row" alignItems="flexStart">
        {isCollapsible && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isCollapsed ? 'plus' : 'minus'}
              size="xs"
              color="primary"
              data-test-subj={`toggleLongFieldValue-${field}`}
              title={
                isCollapsed
                  ? i18n.translate('unifiedDocViewer.docViews.table.viewMoreButton', {
                      defaultMessage: 'View more',
                    })
                  : i18n.translate('unifiedDocViewer.docViews.table.viewLessButton', {
                      defaultMessage: 'View less',
                    })
              }
              aria-expanded={!isCollapsed}
              onClick={onToggleCollapse}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <div
            ref={valueRef}
            className={valueClassName}
            data-test-subj={`tableDocViewRow-${field}-value`}
            // Value returned from formatFieldValue is always sanitized
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: formattedValue }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
