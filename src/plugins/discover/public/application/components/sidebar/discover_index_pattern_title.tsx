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
import { EuiToolTip, EuiFlexItem, EuiFlexGroup, EuiTitle, EuiButtonEmpty } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
export interface DiscoverIndexPatternTitleProps {
  /**
   * determines whether the change link is displayed
   */
  isChangeable: boolean;
  /**
   * function triggered when the change link is clicked
   */
  onChange: () => void;
  /**
   * title of the current index pattern
   */
  title: string;
}

/**
 * Component displaying the title of the current selected index pattern
 * and if changeable is true, a link is provided to change the index pattern
 */
export function DiscoverIndexPatternTitle({
  isChangeable,
  onChange,
  title,
}: DiscoverIndexPatternTitleProps) {
  return (
    <EuiFlexGroup gutterSize="none" responsive={false} className="index-pattern-selection">
      <EuiFlexItem className="eui-textTruncate">
        <EuiToolTip content={title}>
          <EuiTitle size="xxs" className="eui-textTruncate">
            <h2 title={title}>{title}</h2>
          </EuiTitle>
        </EuiToolTip>
      </EuiFlexItem>
      {isChangeable && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              <FormattedMessage
                id="discover.fieldChooser.indexPattern.changeLinkTooltip"
                defaultMessage="Change current index pattern"
              />
            }
          >
            <EuiButtonEmpty
              aria-label={i18n.translate('discover.fieldChooser.indexPattern.changeLinkAriaLabel', {
                defaultMessage: 'Change current index pattern',
              })}
              data-test-subj="indexPattern-switch-link"
              size="xs"
              onClick={() => onChange()}
              iconSide="right"
              iconType="arrowDown"
              color="text"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
