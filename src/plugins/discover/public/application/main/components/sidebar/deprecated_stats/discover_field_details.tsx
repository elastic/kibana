/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiSpacer, EuiText, EuiTitle, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { DiscoverFieldBucket } from './discover_field_bucket';
import { Bucket, FieldDetails } from './types';
import { getDetails, isValidFieldDetails } from './get_details';
import { FetchStatus } from '../../../../types';
import { DataDocuments$ } from '../../../services/discover_data_state_container';

interface DiscoverFieldDetailsProps {
  /**
   * hits fetched from ES, displayed in the doc table
   */
  documents$: DataDocuments$;
  field: DataViewField;
  dataView: DataView;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

export function DiscoverFieldDetails({
  documents$,
  field,
  dataView,
  onAddFilter,
}: DiscoverFieldDetailsProps) {
  const [detailsState, setDetailsState] = useState<{
    details?: FieldDetails;
    loaded: boolean;
  }>();

  useEffect(() => {
    const subscription = documents$.subscribe((data) => {
      if (data.fetchStatus === FetchStatus.COMPLETE) {
        setDetailsState({ details: getDetails(field, data.result, dataView), loaded: true });
      } else {
        setDetailsState({ details: undefined, loaded: data.fetchStatus !== FetchStatus.LOADING });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [documents$, setDetailsState, dataView, field]);

  if (!detailsState?.loaded) {
    return <EuiLoadingSpinner />;
  }

  const details = detailsState?.details;
  if (!details) {
    return null;
  }

  return (
    <div data-test-subj={`discoverFieldDetails-${field.name}`}>
      <EuiTitle size="xxxs">
        <h5>
          {i18n.translate('discover.fieldChooser.discoverField.fieldTopValuesLabel', {
            defaultMessage: 'Top 5 values',
          })}
        </h5>
      </EuiTitle>
      {!isValidFieldDetails(details) && <EuiText size="xs">{details.error}</EuiText>}
      {isValidFieldDetails(details) && (
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
            {onAddFilter && !dataView.metaFields.includes(field.name) && !field.scripted ? (
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
    </div>
  );
}
