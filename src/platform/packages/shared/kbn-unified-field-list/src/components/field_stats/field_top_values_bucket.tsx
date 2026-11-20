/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
  makeHighContrastColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { IFieldSubTypeMulti } from '@kbn/es-query';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { EMPTY_LABEL } from '@kbn/field-formats-common';
import type { AddFieldFilterHandler } from '../../types';

export interface FieldTopValuesBucketParams {
  field: DataViewField;
  fieldValue: unknown;
  formattedFieldValue?: string;
  formattedPercentage: string;
  progressValue: number;
  count: number;
  color: string;
  type?: 'normal' | 'other';
}

export type OverrideFieldTopValueBarCallback = (
  params: FieldTopValuesBucketParams
) => Partial<FieldTopValuesBucketParams>;

export interface FieldTopValuesBucketProps extends FieldTopValuesBucketParams {
  'data-test-subj': string;
  onAddFilter?: AddFieldFilterHandler;
  /**
   * Optional callback to filter for/out the "Other" bucket
   */
  onAddOtherFilter?: (options: { negate: boolean }) => void;
  /**
   * Optional callback to allow overriding props on bucket level
   */
  overrideFieldTopValueBar?: OverrideFieldTopValueBarCallback;
}

const FieldTopValuesBucket: React.FC<FieldTopValuesBucketProps> = ({
  'data-test-subj': dataTestSubject,
  onAddFilter,
  onAddOtherFilter,
  overrideFieldTopValueBar,
  ...fieldTopValuesBucketOverridableProps
}) => {
  const { euiTheme } = useEuiTheme();
  const overrides = overrideFieldTopValueBar
    ? overrideFieldTopValueBar(fieldTopValuesBucketOverridableProps)
    : ({} as FieldTopValuesBucketParams);

  const {
    field,
    type,
    fieldValue,
    formattedFieldValue,
    formattedPercentage,
    progressValue,
    count,
    color,
    textProps = {},
  } = { ...fieldTopValuesBucketOverridableProps, ...overrides };
  const multiFieldParent = (field?.subType as IFieldSubTypeMulti)?.multi?.parent;
  const fieldLabel = multiFieldParent ?? field.name;
  const fieldDisplayName = multiFieldParent ?? field.displayName;
  const isOtherBucket = type === 'other';
  const otherLabel = i18n.translate('unifiedFieldList.fieldStats.otherDocsLabel', {
    defaultMessage: 'Other',
  });
  const filterValueLabel = isOtherBucket ? otherLabel : formattedFieldValue;

  const filterForLabel = i18n.translate('unifiedFieldList.fieldStats.filterValueButtonAriaLabel', {
    defaultMessage: 'Filter for {field}: "{value}"',
    values: { value: filterValueLabel, field: fieldDisplayName },
  });
  const filterOutLabel = i18n.translate(
    'unifiedFieldList.fieldStats.filterOutValueButtonAriaLabel',
    {
      defaultMessage: 'Filter out {field}: "{value}"',
      values: { value: filterValueLabel, field: fieldDisplayName },
    }
  );

  const addFilter: ((options: { negate: boolean }) => void) | undefined = isOtherBucket
    ? onAddOtherFilter
    : onAddFilter && (({ negate }) => onAddFilter(field, fieldValue, negate ? '-' : '+'));
  const filterValueTestSubj = isOtherBucket ? '__other__' : fieldValue;

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
        <EuiProgress
          value={progressValue}
          max={1}
          size="s"
          color={type === 'other' ? 'subdued' : color}
          valueText={
            <div data-test-subj={`${dataTestSubject}-topValues-formattedPercentage`}>
              <EuiToolTip
                content={i18n.translate('unifiedFieldList.fieldStats.bucketPercentageTooltip', {
                  defaultMessage:
                    '{formattedPercentage} ({count, plural, one {# record} other {# records}})',
                  values: {
                    formattedPercentage,
                    count,
                  },
                })}
              >
                <EuiText
                  tabIndex={0}
                  size="xs"
                  textAlign="left"
                  color={getPercentageColor(euiTheme, color)}
                >
                  {formattedPercentage}
                </EuiText>
              </EuiToolTip>
            </div>
          }
          label={
            <div
              data-test-subj={`${dataTestSubject}-topValues-formattedFieldValue`}
              css={css`
                overflow-wrap: anywhere;
              `}
            >
              {(formattedFieldValue?.length ?? 0) > 0 ? (
                <EuiToolTip content={formattedFieldValue}>
                  <EuiTextBlockTruncate lines={3}>
                    <EuiText size="xs" color={'subdued'} {...textProps}>
                      {formattedFieldValue}
                    </EuiText>
                  </EuiTextBlockTruncate>
                </EuiToolTip>
              ) : (
                <EuiText size="xs">
                  {isOtherBucket ? otherLabel : formattedFieldValue === '' ? EMPTY_LABEL : '-'}
                </EuiText>
              )}
            </div>
          }
          labelProps={{
            title: undefined,
            css: css`
              white-space: unset !important;
            `,
          }}
        />
      </EuiFlexItem>
      {onAddFilter && field.filterable && (
        <EuiFlexItem grow={false}>
          {/* buttons stay rendered when the bucket can't be filtered on, so all rows keep the same width */}
          <div
            css={
              !addFilter &&
              css`
                visibility: hidden;
              `
            }
          >
            <EuiToolTip content={filterForLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconSize="s"
                iconType="plusCircle"
                onClick={() => addFilter?.({ negate: false })}
                aria-label={filterForLabel}
                data-test-subj={`plus-${fieldLabel}-${filterValueTestSubj}`}
                style={{
                  minHeight: 'auto',
                  minWidth: 'auto',
                  paddingRight: 2,
                  paddingLeft: 2,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
              />
            </EuiToolTip>
            <EuiToolTip content={filterOutLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconSize="s"
                iconType="minusCircle"
                onClick={() => addFilter?.({ negate: true })}
                aria-label={filterOutLabel}
                data-test-subj={`minus-${fieldLabel}-${filterValueTestSubj}`}
                style={{
                  minHeight: 'auto',
                  minWidth: 'auto',
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingRight: 2,
                  paddingLeft: 2,
                }}
              />
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

// copied from x-pack/plugins/banners/server/utils.ts
const hexColorRegexp = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
const isHexColor = (color: string) => {
  return hexColorRegexp.test(color);
};

const getPercentageColor = (euiTheme: EuiThemeComputed, color: string) =>
  euiTheme.themeName?.toLowerCase().includes('borealis') && isHexColor(color)
    ? makeHighContrastColor(color)(euiTheme)
    : color; // FIXME: remove in 9.x when Borealis becomes the default theme

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldTopValuesBucket;
