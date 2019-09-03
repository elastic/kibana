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


import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from 'ui/modules';

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

const module = uiModules.get('discover/field_chooser');

function StringFieldProgressBar(props) {
  return (
    <EuiToolTip
      anchorClassName="dscProgressBarTooltip__anchor"
      content={props.count}
      delay="regular"
      position="right"
    >
      <EuiFlexGroup
        alignItems="center"
      >
        <EuiFlexItem>
          <EuiProgress
            value={props.percent}
            max={100}
            color="secondary"
            aria-labelledby="CanvasAssetManagerLabel"
            size="l"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
          >
            {props.percent}%
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
}

module.directive('stringFieldProgressBar', function (reactDirective) {
  return reactDirective(wrapInI18nContext(StringFieldProgressBar));
});
