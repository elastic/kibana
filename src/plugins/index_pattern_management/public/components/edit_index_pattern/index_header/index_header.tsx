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
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiToolTip,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiButtonIcon,
} from '@elastic/eui';
import { IIndexPattern } from 'src/plugins/data/public';

interface IndexHeaderProps {
  indexPattern: IIndexPattern;
  defaultIndex?: string;
  setDefault?: () => void;
  refreshFields?: () => void;
  deleteIndexPatternClick?: () => void;
}

const setDefaultAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.setDefaultAria',
  {
    defaultMessage: 'Set as default index.',
  }
);

const setDefaultTooltip = i18n.translate(
  'indexPatternManagement.editIndexPattern.setDefaultTooltip',
  {
    defaultMessage: 'Set as default index.',
  }
);

const refreshAriaLabel = i18n.translate('indexPatternManagement.editIndexPattern.refreshAria', {
  defaultMessage: 'Reload field list.',
});

const refreshTooltip = i18n.translate('indexPatternManagement.editIndexPattern.refreshTooltip', {
  defaultMessage: 'Refresh field list.',
});

const removeAriaLabel = i18n.translate('indexPatternManagement.editIndexPattern.removeAria', {
  defaultMessage: 'Remove index pattern.',
});

const removeTooltip = i18n.translate('indexPatternManagement.editIndexPattern.removeTooltip', {
  defaultMessage: 'Remove index pattern.',
});

export function IndexHeader({
  defaultIndex,
  indexPattern,
  setDefault,
  refreshFields,
  deleteIndexPatternClick,
}: IndexHeaderProps) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          {defaultIndex === indexPattern.id && (
            <EuiFlexItem grow={false} style={{ marginRight: 0 }}>
              <EuiIcon size="xl" type="starFilled" />
            </EuiFlexItem>
          )}
          <EuiFlexItem style={defaultIndex === indexPattern.id ? { marginLeft: 0 } : {}}>
            <EuiTitle>
              <h1 data-test-subj="indexPatternTitle">{indexPattern.title}</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          {setDefault && (
            <EuiFlexItem>
              <EuiToolTip content={setDefaultTooltip}>
                <EuiButtonIcon
                  color="text"
                  onClick={setDefault}
                  iconType="starFilled"
                  aria-label={setDefaultAriaLabel}
                  data-test-subj="setDefaultIndexPatternButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}

          {refreshFields && (
            <EuiFlexItem>
              <EuiToolTip content={refreshTooltip}>
                <EuiButtonIcon
                  color="text"
                  onClick={refreshFields}
                  iconType="refresh"
                  aria-label={refreshAriaLabel}
                  data-test-subj="refreshFieldsIndexPatternButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}

          {deleteIndexPatternClick && (
            <EuiFlexItem>
              <EuiToolTip content={removeTooltip}>
                <EuiButtonIcon
                  color="danger"
                  onClick={deleteIndexPatternClick}
                  iconType="trash"
                  aria-label={removeAriaLabel}
                  data-test-subj="deleteIndexPatternButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
