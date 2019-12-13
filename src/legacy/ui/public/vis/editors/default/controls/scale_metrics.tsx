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
import { SwitchParamEditor } from './switch';
import { AggParamEditorProps } from '..';

function ScaleMetricsParamEditor(props: AggParamEditorProps<boolean>) {
  return (
    <SwitchParamEditor
      dataTestSubj="scaleMetricsSwitch"
      displayLabel={i18n.translate('data.search.aggs.scaleMetricsLabel', {
        defaultMessage: 'Scale metric values (deprecated)',
      })}
      displayToolTip={i18n.translate('data.search.aggs.scaleMetricsTooltip', {
        defaultMessage:
          'If you select a manual minimum interval and a larger interval will be used, enabling this will ' +
          'cause count and sum metrics to be scaled to the manual selected interval.',
      })}
      {...props}
    />
  );
}

export { ScaleMetricsParamEditor };
