/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { DataView, DataViewField } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { BucketedAggregation } from '../../../common/types';
import { FieldTopValuesBucket } from './field_top_values_bucket';

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
      {buckets.map((topValue, index) => {
        const formatted = formatter.convert(topValue.key);

        return (
          <>
            {index > 0 && <EuiSpacer size="s" />}
            <FieldTopValuesBucket
              key={topValue.key}
              formattedLabel={formatted}
              formattedValue={`${(
                Math.round((topValue.count / sampledValuesCount!) * 1000) / 10
              ).toFixed(digitsRequired ? 1 : 0)}%`}
              progressValue={topValue.count / sampledValuesCount!}
              testSubject={testSubject}
            />
          </>
        );
      })}
      {otherCount > 0 && (
        <>
          <EuiSpacer size="s" />
          <FieldTopValuesBucket
            key="other"
            formattedLabel={i18n.translate('unifiedFieldList.fieldStats.otherDocsLabel', {
              defaultMessage: 'Other',
            })}
            formattedValue={`${(Math.round((otherCount / sampledValuesCount!) * 1000) / 10).toFixed(
              digitsRequired ? 1 : 0
            )}%`}
            progressValue={otherCount / sampledValuesCount!}
            progressColor="subdued"
            testSubject={testSubject}
          />
        </>
      )}
    </div>
  );
};
