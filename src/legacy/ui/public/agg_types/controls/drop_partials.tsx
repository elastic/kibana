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
import { EuiSpacer, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from 'ui/vis/editors/default';

function DropPartialsParamEditor({ agg, aggParam, value, setValue }: AggParamEditorProps<boolean>) {
  const content = i18n.translate('common.ui.aggTypes.dropPartialBucketsTooltip', {
    defaultMessage:
      "Remove buckets that span time outside the time range so the histogram doesn't start and end with incomplete buckets.",
  });

  const label = i18n.translate('common.ui.aggTypes.dropPartialBucketsLabel', {
    defaultMessage: 'Drop partial buckets',
  });

  return (
    <>
      <EuiToolTip content={content} delay="long" position="right">
        <EuiSwitch
          label={label}
          checked={value}
          data-test-subj="dropPartialBucketsCheckbox"
          onChange={ev => setValue(ev.target.checked)}
        />
      </EuiToolTip>
      <EuiSpacer size="s" />
    </>
  );
}

export { DropPartialsParamEditor };
