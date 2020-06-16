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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { IndexPatternField } from '../../../../../data/public';
import { i18n } from '@kbn/i18n';
import './string_progress_bar.scss';

interface Props {
  percent: number;
  count: number;
  field: IndexPatternField;
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  value: string;
}

export function StringFieldProgressBar({ field, value, onAddFilter, percent, count }: Props) {
  const addLabel = i18n.translate('discover.fieldChooser.detailViews.filterValueButtonAriaLabel', {
    defaultMessage: 'Filter for {field}: "{value}"',
    values: { value: value, field: field.name },
  });
  const removeLabel = i18n.translate(
    'discover.fieldChooser.detailViews.filterOutValueButtonAriaLabel',
    {
      defaultMessage: 'Filter out {field}: "{value}"',
      values: { value: value, field: field.name },
    }
  );
  const tooltipContent = `${value} ${count}`;
  return (
    <EuiToolTip
      anchorClassName="dscProgressBarTooltip__anchor"
      content={tooltipContent}
      delay="regular"
      position="right"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiProgress value={percent} max={100} color="secondary" aria-hidden={true} size="s" />
        </EuiFlexItem>
        {field.filterable && (
          <EuiFlexItem grow={false}>
            <div>
              <EuiButtonIcon
                iconSize="s"
                iconType="magnifyWithPlus"
                onClick={() => onAddFilter(field, value, '+')}
                aria-label={addLabel}
                data-test-subj={`plus-${field.name}-${value}`}
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
                onClick={() => onAddFilter(field, value, '-')}
                aria-label={removeLabel}
                data-test-subj={`minus-${field.name}-${value}`}
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
    </EuiToolTip>
  );
}
