/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { StringFieldProgressBar } from './string_progress_bar';
import { Bucket } from './types';
import './discover_field_bucket.scss';

interface Props {
  bucket: Bucket;
  field: DataViewField;
  onAddFilter: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

export function DiscoverFieldBucket({ field, bucket, onAddFilter }: Props) {
  const emptyTxt = i18n.translate('discover.fieldChooser.detailViews.emptyStringText', {
    defaultMessage: 'Empty string',
  });
  const addLabel = i18n.translate('discover.fieldChooser.detailViews.filterValueButtonAriaLabel', {
    defaultMessage: 'Filter for {field}: "{value}"',
    values: { value: bucket.value, field: field.name },
  });
  const removeLabel = i18n.translate(
    'discover.fieldChooser.detailViews.filterOutValueButtonAriaLabel',
    {
      defaultMessage: 'Filter out {field}: "{value}"',
      values: { value: bucket.value, field: field.name },
    }
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false} gutterSize="s">
        <EuiFlexItem className="dscFieldDetails__barContainer" grow={1}>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={1} className="eui-textTruncate">
              <EuiText
                title={
                  bucket.display === ''
                    ? emptyTxt
                    : `${bucket.display}: ${bucket.count} (${bucket.percent}%)`
                }
                size="xs"
                className="eui-textTruncate"
              >
                {bucket.display === '' ? emptyTxt : bucket.display}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="eui-textTruncate">
              <EuiText color="success" size="xs" className="eui-textTruncate">
                {bucket.percent}%
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <StringFieldProgressBar
            value={bucket.value}
            percent={bucket.percent}
            count={bucket.count}
          />
        </EuiFlexItem>
        {field.filterable && (
          <EuiFlexItem grow={false}>
            <div>
              <EuiButtonIcon
                iconSize="s"
                iconType="plusInCircle"
                onClick={() => onAddFilter(field, bucket.value, '+')}
                aria-label={addLabel}
                data-test-subj={`plus-${field.name}-${bucket.value}`}
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
                iconType="minusInCircle"
                onClick={() => onAddFilter(field, bucket.value, '-')}
                aria-label={removeLabel}
                data-test-subj={`minus-${field.name}-${bucket.value}`}
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
      <EuiSpacer size="s" />
    </>
  );
}
