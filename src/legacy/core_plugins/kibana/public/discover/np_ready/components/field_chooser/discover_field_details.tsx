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
import { EuiLink, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DiscoverFieldBucket } from './discover_field_bucket';
import { getWarnings } from './lib/get_warnings';

export interface Field {
  details: {
    error: string;
    exists: number;
    total: boolean;
    buckets: any;
    visualizeUrl: string;
  };
  indexPattern: {
    metaFields: string[];
  };
  scripted: boolean;
  name: string;
  filterable: boolean;
  visualizable: boolean;
  type: string;
  /**
   * determines if a field is selected and displayed in the doc table
   */
  display: boolean;
}

interface Props {
  field: Field;
  onAddFilter: (field: Field | string, value: string, type: '+' | '-') => void;
}

export function DiscoverFieldDetails({ field, onAddFilter }: Props) {
  const warnings = getWarnings(field);

  return (
    <div className="dscFieldDetails">
      {!field.details.error && (
        <p className="euiText euiText--extraSmall euiTextColor--subdued">
          <FormattedMessage
            id="kbn.discover.fieldChooser.detailViews.topValuesInRecordsDescription"
            defaultMessage="Top 5 values in"
          />{' '}
          {field.indexPattern.metaFields.includes(field.name) && !field.scripted && (
            <EuiLink className="kuiLink" onClick={() => onAddFilter('_exists_', field.name, '+')}>
              {field.details.exists}
            </EuiLink>
          )}{' '}
          {field.indexPattern.metaFields.includes(field.name) && field.scripted && (
            <span>{field.details.exists}</span>
          )}
          / {field.details.total}{' '}
          <FormattedMessage
            id="kbn.discover.fieldChooser.detailViews.recordsText"
            defaultMessage="records"
          />
        </p>
      )}
      {field.details.error && (
        <div className="euiText euiText--extraSmall euiTextColor--subdued">
          {field.details.error}
        </div>
      )}
      {!field.details.error && (
        <div style={{ marginTop: '4px' }}>
          {field.details.buckets.map((bucket: any, idx: number) => (
            <DiscoverFieldBucket
              key={`bucket${idx}`}
              bucket={bucket}
              field={field}
              onAddFilter={onAddFilter}
            />
          ))}
        </div>
      )}

      {field.details.visualizeUrl && (
        <>
          <EuiLink
            href={field.details.visualizeUrl}
            className="kuiButton kuiButton--secondary kuiButton--small kuiVerticalRhythmSmall"
            data-test-subj={`fieldVisualize-${field.name}`}
          >
            <FormattedMessage
              id="kbn.discover.fieldChooser.detailViews.visualizeLinkText"
              defaultMessage="Visualize"
            />
          </EuiLink>
          {warnings.length > 0 && (
            <EuiToolTip content={warnings.join(' ')}>
              <span>
                (
                <FormattedMessage
                  id="kbn.discover.fieldChooser.detailViews.warningsText"
                  defaultMessage="warningsLength, plural, one {warning} other {warnings}"
                  values={{ warningsLength: warnings.length }}
                />
                <i aria-hidden="true" className="fa fa-warning" /> )
              </span>
            </EuiToolTip>
          )}
        </>
      )}
    </div>
  );
}
