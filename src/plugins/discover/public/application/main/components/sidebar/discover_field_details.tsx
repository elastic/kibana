/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { DiscoverFieldBucket } from './discover_field_bucket';
import { Bucket, FieldDetails } from './types';

interface DiscoverFieldDetailsProps {
  field: DataViewField;
  indexPattern: DataView;
  details: FieldDetails;
  onAddFilter: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

export function DiscoverFieldDetails({
  field,
  indexPattern,
  details,
  onAddFilter,
}: DiscoverFieldDetailsProps) {
  return (
    <>
      {details.error && <EuiText size="xs">{details.error}</EuiText>}
      {!details.error && (
        <>
          <div style={{ marginTop: '4px' }}>
            {details.buckets.map((bucket: Bucket, idx: number) => (
              <DiscoverFieldBucket
                key={`bucket${idx}`}
                bucket={bucket}
                field={field}
                onAddFilter={onAddFilter}
              />
            ))}
          </div>
          <EuiSpacer size="xs" />
          <EuiText size="xs">
            {!indexPattern.metaFields.includes(field.name) && !field.scripted ? (
              <EuiLink
                onClick={() => onAddFilter('_exists_', field.name, '+')}
                data-test-subj="onAddFilterButton"
              >
                <FormattedMessage
                  id="discover.fieldChooser.detailViews.existsInRecordsText"
                  defaultMessage="Exists in {value} / {totalValue} records"
                  values={{
                    value: details.exists,
                    totalValue: details.total,
                  }}
                />
              </EuiLink>
            ) : (
              <FormattedMessage
                id="discover.fieldChooser.detailViews.valueOfRecordsText"
                defaultMessage="{value} / {totalValue} records"
                values={{
                  value: details.exists,
                  totalValue: details.total,
                }}
              />
            )}
          </EuiText>
        </>
      )}
    </>
  );
}
