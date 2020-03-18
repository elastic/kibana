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
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StringFieldProgressBar } from './string_progress_bar';
import { getBucketAriaLabel } from './lib/get_bucket_aria_label';
import { Bucket, Field } from './types';

interface Props {
  bucket: Bucket;
  field: Field;
  onAddFilter: (field: Field | string, value: string, type: '+' | '-') => void;
}

export function DiscoverFieldBucket({ field, bucket, onAddFilter }: Props) {
  const emptyTxt = i18n.translate('kbn.discover.fieldChooser.detailViews.emptyStringText', {
    defaultMessage: 'Empty string',
  });
  const addLabel = i18n.translate(
    'kbn.discover.fieldChooser.detailViews.filterValueButtonAriaLabel',
    {
      defaultMessage: 'Filter for this value',
    }
  );
  const removeLabel = i18n.translate(
    'kbn.discover.fieldChooser.detailViews.filterOutValueButtonAriaLabel',
    {
      defaultMessage: 'Filter out this value',
    }
  );
  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem aria-label={getBucketAriaLabel(bucket)} className="eui-textTruncate">
          <EuiText size="xs" className="eui-textTruncate">
            {bucket.display === '' ? emptyTxt : bucket.display}
          </EuiText>
        </EuiFlexItem>
        {field.filterable && (
          <EuiFlexItem grow={false}>
            <div>
              <EuiButtonIcon
                iconSize="s"
                iconType="magnifyWithPlus"
                onClick={() => onAddFilter(field, bucket.value, '+')}
                aria-label={addLabel}
                data-test-subj={`plus-${field.name}-${bucket.display}`}
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
                iconType="magnifyWithMinus"
                onClick={() => onAddFilter(field, bucket.value, '-')}
                aria-label={removeLabel}
                data-test-subj={`minus-${field.name}-${bucket.display}`}
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
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <StringFieldProgressBar percent={bucket.percent} count={bucket.count} />
    </>
  );
}
