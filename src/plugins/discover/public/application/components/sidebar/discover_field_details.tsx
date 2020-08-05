/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState, useEffect } from 'react';
import { EuiLink, EuiIconTip, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DiscoverFieldBucket } from './discover_field_bucket';
import { getWarnings } from './lib/get_warnings';
import { triggerVisualizeActions, isFieldVisualizable } from './lib/visualize_trigger_utils';
import { Bucket, FieldDetails } from './types';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';

interface DiscoverFieldDetailsProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  details: FieldDetails;
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
}

export function DiscoverFieldDetails({
  field,
  indexPattern,
  details,
  onAddFilter,
}: DiscoverFieldDetailsProps) {
  const warnings = getWarnings(field);
  const [showVisualizeLink, setShowVisualizeLink] = useState<boolean | undefined>(false);

  useEffect(() => {
    isFieldVisualizable(field, indexPattern.id, details.columns).then(
      (flag) => {
        setShowVisualizeLink(flag);
      },
      () => {
        setShowVisualizeLink(false);
      }
    );
  }, [field, indexPattern.id, details.columns]);

  return (
    <div className="dscFieldDetails">
      {!details.error && (
        <EuiText size="xs">
          <FormattedMessage
            id="discover.fieldChooser.detailViews.topValuesInRecordsDescription"
            defaultMessage="Top 5 values in"
          />{' '}
          {!indexPattern.metaFields.includes(field.name) && !field.scripted ? (
            <EuiLink onClick={() => onAddFilter('_exists_', field.name, '+')}>
              {details.exists}
            </EuiLink>
          ) : (
            <span>{details.exists}</span>
          )}{' '}
          / {details.total}{' '}
          <FormattedMessage
            id="discover.fieldChooser.detailViews.recordsText"
            defaultMessage="records"
          />
        </EuiText>
      )}
      {details.error && <EuiText size="xs">{details.error}</EuiText>}
      {!details.error && (
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
      )}

      {showVisualizeLink && (
        <>
          <EuiLink
            onClick={() => {
              triggerVisualizeActions(field, indexPattern.id, details.columns);
            }}
            className="kuiButton kuiButton--secondary kuiButton--small kuiVerticalRhythmSmall"
            data-test-subj={`fieldVisualize-${field.name}`}
          >
            <FormattedMessage
              id="discover.fieldChooser.detailViews.visualizeLinkText"
              defaultMessage="Visualize"
            />
            {warnings.length > 0 && (
              <EuiIconTip type="alert" color="warning" content={warnings.join(' ')} />
            )}
          </EuiLink>
        </>
      )}
    </div>
  );
}
