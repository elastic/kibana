/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { DataView, DataViewField } from '@kbn/data-plugin/common';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { BucketedAggregation } from '../../../common/types';

export interface FieldTopValuesProps {
  buckets: BucketedAggregation<number | string>['buckets'];
  dataView: DataView;
  field: DataViewField;
  sampledValuesCount: number;
  testSubject: string;
}

export const FieldTopValues: React.FC<FieldTopValuesProps> = ({
  buckets,
  dataView,
  field,
  testSubject,
  sampledValuesCount,
}) => {
  const { euiTheme } = useEuiTheme();

  const topValueStyles = useMemo(
    () => css`
      margin-bottom: ${euiTheme.size.s};

      &:last-of-type {
        margin-bottom: 0;
      }
    `,
    [euiTheme]
  );

  if (!buckets?.length) {
    return null;
  }

  const formatter = dataView.getFormatterForField(field);
  const totalValuesCount = buckets.reduce((prev, bucket) => bucket.count + prev, 0);
  const otherCount =
    sampledValuesCount && totalValuesCount ? sampledValuesCount - totalValuesCount : 0;
  const digitsRequired = buckets.some(
    (topValue) => !Number.isInteger(topValue.count / sampledValuesCount!)
  );

  return (
    <div data-test-subj={`${testSubject}-topValues`}>
      {buckets.map((topValue) => {
        const formatted = formatter.convert(topValue.key);

        return (
          <div css={topValueStyles} key={topValue.key}>
            <EuiFlexGroup
              alignItems="stretch"
              key={topValue.key}
              gutterSize="xs"
              responsive={false}
            >
              <EuiFlexItem
                grow={true}
                className="eui-textTruncate"
                data-test-subj={`${testSubject}-topValues-value`}
              >
                {formatted === '' ? (
                  <EuiText size="xs" color="subdued">
                    <em>
                      {i18n.translate('unifiedFieldList.fieldStats.emptyStringValueLabel', {
                        defaultMessage: 'Empty string',
                      })}
                    </em>
                  </EuiText>
                ) : (
                  <EuiToolTip content={formatted} delay="long">
                    <EuiText size="xs" color="subdued" className="eui-textTruncate">
                      {formatted}
                    </EuiText>
                  </EuiToolTip>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false} data-test-subj={`${testSubject}-topValues-valueCount`}>
                <EuiText size="xs" textAlign="left" color={euiTheme.colors.primaryText}>
                  {(Math.round((topValue.count / sampledValuesCount!) * 1000) / 10).toFixed(
                    digitsRequired ? 1 : 0
                  )}
                  %
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiProgress
              value={topValue.count / sampledValuesCount!}
              max={1}
              size="s"
              color="primary"
            />
          </div>
        );
      })}
      {otherCount ? (
        <>
          <EuiFlexGroup alignItems="stretch" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={true} className="eui-textTruncate">
              <EuiText size="xs" className="eui-textTruncate" color="subdued">
                {i18n.translate('unifiedFieldList.fieldStats.otherDocsLabel', {
                  defaultMessage: 'Other',
                })}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false} className="eui-textTruncate">
              <EuiText size="xs" color="subdued">
                {(Math.round((otherCount / sampledValuesCount!) * 1000) / 10).toFixed(
                  digitsRequired ? 1 : 0
                )}
                %
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiProgress value={otherCount / sampledValuesCount!} max={1} size="s" color="subdued" />
        </>
      ) : (
        <></>
      )}
    </div>
  );
};
