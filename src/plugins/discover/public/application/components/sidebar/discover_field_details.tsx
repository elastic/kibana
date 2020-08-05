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
import React from 'react';
import { EuiLink, EuiIconTip, EuiText, EuiPopoverFooter, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DiscoverFieldBucket } from './discover_field_bucket';
import { getWarnings } from './lib/get_warnings';
import { Bucket, FieldDetails } from './types';
import { getServices } from '../../../kibana_services';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import './discover_field_details.scss';

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

  return (
    <>
      <div className="dscFieldDetails">
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

        {details.visualizeUrl && (
          <>
            <EuiSpacer size="xs" />
            <EuiButton
              onClick={() => {
                getServices().core.application.navigateToApp(details.visualizeUrl.app, {
                  path: details.visualizeUrl.path,
                });
              }}
              size="s"
              className="dscFieldDetails__visualizeBtn"
              data-test-subj={`fieldVisualize-${field.name}`}
            >
              <FormattedMessage
                id="discover.fieldChooser.detailViews.visualizeLinkText"
                defaultMessage="Visualize"
              />
            </EuiButton>
            {warnings.length > 0 && (
              <EuiIconTip type="alert" color="warning" content={warnings.join(' ')} />
            )}
          </>
        )}
      </div>
      {!details.error && (
        <EuiPopoverFooter>
          <EuiText size="xs" textAlign="center">
            {!indexPattern.metaFields.includes(field.name) && !field.scripted ? (
              <EuiLink onClick={() => onAddFilter('_exists_', field.name, '+')}>
                <FormattedMessage
                  id="discover.fieldChooser.detailViews.existsText"
                  defaultMessage="Exists in"
                />{' '}
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
        </EuiPopoverFooter>
      )}
    </>
  );
}
