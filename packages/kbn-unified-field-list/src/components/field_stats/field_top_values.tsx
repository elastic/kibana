/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import { euiPaletteColorBlind, EuiSpacer } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AddFieldFilterHandler, BucketedAggregation } from '../../types';
import FieldTopValuesBucket from './field_top_values_bucket';
import type { OverrideFieldTopValueBarCallback } from './field_top_values_bucket';

export interface FieldTopValuesProps {
  areExamples: boolean | undefined; // real top values or only examples distributed in buckets
  buckets: BucketedAggregation<number | string | boolean>['buckets'];
  dataView: DataView;
  field: DataViewField;
  sampledValuesCount: number;
  color?: string;
  'data-test-subj': string;
  onAddFilter?: AddFieldFilterHandler;
  overrideFieldTopValueBar?: OverrideFieldTopValueBarCallback;
}

export const FieldTopValues: React.FC<FieldTopValuesProps> = ({
  areExamples,
  buckets,
  dataView,
  field,
  sampledValuesCount,
  color = getDefaultColor(),
  'data-test-subj': dataTestSubject,
  onAddFilter,
  overrideFieldTopValueBar,
}) => {
  if (!buckets?.length) {
    return null;
  }

  const formatter = dataView.getFormatterForField(field);
  const otherCount = getOtherCount(getBucketsValuesCount(buckets), sampledValuesCount);
  const digitsRequired = buckets.some(
    (bucket) => !Number.isInteger(bucket.count / sampledValuesCount)
  );

  return (
    <div
      data-test-subj={
        areExamples ? 'unifiedFieldStats-exampleValueBuckets' : 'unifiedFieldStats-topValueBuckets'
      }
    >
      <div data-test-subj={`${dataTestSubject}-topValues`}>
        {buckets.map((bucket, index) => {
          const fieldValue = bucket.key;
          const formatted = formatter.convert(fieldValue);

          return (
            <Fragment key={String(fieldValue)}>
              {index > 0 && <EuiSpacer size="s" />}
              <FieldTopValuesBucket
                field={field}
                fieldValue={fieldValue}
                formattedFieldValue={formatted}
                formattedPercentage={getFormattedPercentageValue(
                  bucket.count,
                  sampledValuesCount,
                  digitsRequired
                )}
                progressValue={getProgressValue(bucket.count, sampledValuesCount)}
                count={bucket.count}
                color={color}
                data-test-subj={dataTestSubject}
                onAddFilter={onAddFilter}
                overrideFieldTopValueBar={overrideFieldTopValueBar}
              />
            </Fragment>
          );
        })}
        {otherCount > 0 && (
          <>
            <EuiSpacer size="s" />
            <FieldTopValuesBucket
              type="other"
              field={field}
              fieldValue={undefined}
              formattedPercentage={getFormattedPercentageValue(
                otherCount,
                sampledValuesCount,
                digitsRequired
              )}
              progressValue={getProgressValue(otherCount, sampledValuesCount)}
              count={otherCount}
              color={color}
              data-test-subj={dataTestSubject}
              onAddFilter={onAddFilter}
              overrideFieldTopValueBar={overrideFieldTopValueBar}
            />
          </>
        )}
      </div>
    </div>
  );
};

export const getDefaultColor = () => euiPaletteColorBlind()[1];

export const getFormattedPercentageValue = (
  currentValue: number,
  totalCount: number,
  digitsRequired: boolean
): string => {
  return totalCount > 0
    ? `${(Math.round((currentValue / totalCount) * 1000) / 10).toFixed(digitsRequired ? 1 : 0)}%`
    : '';
};

export const getProgressValue = (currentValue: number, totalCount: number): number => {
  return totalCount > 0 ? currentValue / totalCount : 0;
};

export const getBucketsValuesCount = (
  buckets?: BucketedAggregation<number | string | boolean>['buckets']
): number => {
  return buckets?.reduce((prev, bucket) => bucket.count + prev, 0) || 0;
};

export const getOtherCount = (bucketsValuesCount: number, sampledValuesCount: number): number => {
  return sampledValuesCount && bucketsValuesCount ? sampledValuesCount - bucketsValuesCount : 0;
};
