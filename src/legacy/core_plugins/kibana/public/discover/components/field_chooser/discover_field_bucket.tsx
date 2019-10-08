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
import { TextTruncate } from './lib/text_truncate';
import { getBucketAriaLabel } from './lib/get_bucket_aria_label';
import { Field } from './discover_field_details';

interface Bucket {
  display: string;
  value: any;
  percent: any;
  count: any;
}

interface Props {
  bucket: Bucket;
  field: Field;
  onAddFilter: any;
}

export function DiscoverFieldBucket({ field, bucket, onAddFilter }: Props) {
  const emptyTxt = i18n.translate('kbn.discover.fieldChooser.detailViews.emptyStringText', {
    defaultMessage: 'Empty string',
  });
  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem aria-label={getBucketAriaLabel(bucket)} style={{ overflow: 'hidden' }}>
          <div className="eui-textTruncate">
            <TextTruncate value={bucket.display}>
              <EuiText size="xs">{bucket.display === '' ? emptyTxt : bucket.display}</EuiText>
            </TextTruncate>
          </div>
        </EuiFlexItem>
        {field.filterable && (
          <EuiFlexItem grow={false}>
            <div>
              <EuiButtonIcon
                iconSize="s"
                iconType="magnifyWithPlus"
                onClick={() => onAddFilter(field, bucket.value, '+')}
                aria-label="{{::'kbn.discover.fieldChooser.detailViews.filterValueButtonAriaLabel' | i18n: {defaultMessage: 'Filter for this value'} }}"
                data-test-subj={`plus-${field.name}-${bucket.display}`}
                style={{
                  minHeight: 'auto',
                  minWidth: 'auto',
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
              />
              <EuiButtonIcon
                iconSize="s"
                iconType="magnifyWithMinus"
                onClick={() => onAddFilter(field, bucket.value, '-')}
                aria-label="{{::'kbn.discover.fieldChooser.detailViews.filterOutValueButtonAriaLabel' | i18n: {defaultMessage: 'Filter out this value'} }}"
                data-test-subj={`minus-${field.name}-${bucket.display}`}
                style={{
                  minHeight: 'auto',
                  minWidth: 'auto',
                  paddingTop: 0,
                  paddingBottom: 0,
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
