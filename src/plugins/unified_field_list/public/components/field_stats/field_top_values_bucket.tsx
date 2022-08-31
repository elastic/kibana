/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { IFieldSubTypeMulti } from '@kbn/es-query';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { AddFieldFilterHandler } from '../../types';

export interface FieldTopValuesBucketProps {
  type?: 'normal' | 'other';
  field: DataViewField;
  fieldValue: unknown;
  formattedFieldValue?: string;
  formattedPercentage: string;
  progressValue: number;
  count: number;
  color: string;
  'data-test-subj': string;
  onAddFilter?: AddFieldFilterHandler;
}

export const FieldTopValuesBucket: React.FC<FieldTopValuesBucketProps> = ({
  type = 'normal',
  field,
  fieldValue,
  formattedFieldValue,
  formattedPercentage,
  progressValue,
  count,
  color,
  'data-test-subj': dataTestSubject,
  onAddFilter,
}) => {
  const fieldLabel = (field?.subType as IFieldSubTypeMulti)?.multi?.parent ?? field.name;

  return (
    <EuiFlexGroup
      alignItems="stretch"
      gutterSize="s"
      responsive={false}
      data-test-subj={`${dataTestSubject}-topValues-bucket`}
    >
      <EuiFlexItem
        grow={1}
        css={css`
          min-width: 0;
        `}
      >
        <EuiFlexGroup alignItems="stretch" gutterSize="s" responsive={false}>
          <EuiFlexItem
            grow={true}
            className="eui-textTruncate"
            data-test-subj={`${dataTestSubject}-topValues-formattedFieldValue`}
          >
            {(formattedFieldValue?.length ?? 0) > 0 ? (
              <EuiToolTip content={formattedFieldValue} delay="long">
                <EuiText size="xs" className="eui-textTruncate" color="subdued">
                  {formattedFieldValue}
                </EuiText>
              </EuiToolTip>
            ) : (
              <EuiText size="xs">
                {type === 'other'
                  ? i18n.translate('unifiedFieldList.fieldStats.otherDocsLabel', {
                      defaultMessage: 'Other',
                    })
                  : formattedFieldValue === ''
                  ? i18n.translate('unifiedFieldList.fieldStats.emptyStringValueLabel', {
                      defaultMessage: '(empty)',
                    })
                  : '-'}
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            data-test-subj={`${dataTestSubject}-topValues-formattedPercentage`}
          >
            <EuiToolTip
              content={i18n.translate('unifiedFieldList.fieldStats.bucketPercentageTooltip', {
                defaultMessage:
                  '{formattedPercentage} ({count, plural, one {# record} other {# records}})',
                values: {
                  formattedPercentage,
                  count,
                },
              })}
              delay="long"
            >
              <EuiText size="xs" textAlign="left" color={color}>
                {formattedPercentage}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiProgress
          value={progressValue}
          max={1}
          size="s"
          color={type === 'other' ? 'subdued' : color}
          aria-label={`${formattedFieldValue} (${formattedPercentage})`}
        />
      </EuiFlexItem>
      {onAddFilter && field.filterable && (
        <EuiFlexItem grow={false}>
          {type === 'other' ? (
            <div
              css={css`
                width: 48px;
              `}
            />
          ) : (
            <div>
              <EuiButtonIcon
                iconSize="s"
                iconType="plusInCircle"
                onClick={() => onAddFilter(field, fieldValue, '+')}
                aria-label={i18n.translate(
                  'unifiedFieldList.fieldStats.filterValueButtonAriaLabel',
                  {
                    defaultMessage: 'Filter for {field}: "{value}"',
                    values: { value: formattedFieldValue, field: fieldLabel },
                  }
                )}
                data-test-subj={`plus-${fieldLabel}-${fieldValue}`}
                style={{
                  minHeight: 'auto',
                  minWidth: 'auto',
                  paddingRight: 2,
                  paddingLeft: 2,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
              />
              <EuiButtonIcon
                iconSize="s"
                iconType="minusInCircle"
                onClick={() => onAddFilter(field, fieldValue, '-')}
                aria-label={i18n.translate(
                  'unifiedFieldList.fieldStats.filterOutValueButtonAriaLabel',
                  {
                    defaultMessage: 'Filter out {field}: "{value}"',
                    values: { value: formattedFieldValue, field: fieldLabel },
                  }
                )}
                data-test-subj={`minus-${fieldLabel}-${fieldValue}`}
                style={{
                  minHeight: 'auto',
                  minWidth: 'auto',
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingRight: 2,
                  paddingLeft: 2,
                }}
              />
            </div>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
