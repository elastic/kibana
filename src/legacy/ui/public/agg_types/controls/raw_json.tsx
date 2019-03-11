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

import { EuiFormRow, EuiIcon, EuiTextArea, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import React, { useState } from 'react';
import { AggConfig } from 'ui/vis/agg_config';
import { isValidJson } from '../utils';

interface RawJSONSelectProps {
  agg: AggConfig;
  onParamsChange: (
    type: string,
    agg: AggConfig,
    field: any,
    options?: { isValid?: boolean }
  ) => void;
}

function RawJSONSelect({ agg = {}, onParamsChange }: RawJSONSelectProps) {
  const [isInvalid, setIsInvalid] = useState(false);

  const label = (
    <>
      <FormattedMessage id="common.ui.aggTypes.jsonInputLabel" defaultMessage="JSON Input" />{' '}
      <EuiToolTip
        position="right"
        content={i18n.translate('common.ui.aggTypes.jsonInputTooltip', {
          defaultMessage:
            "Any JSON formatted properties you add here will be merged with the elasticsearch aggregation definition for this section. For example 'shard_size' on a terms aggregation.",
        })}
      >
        <EuiIcon type="questionInCircle" />
      </EuiToolTip>
    </>
  );
  const onTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value: string = get(e, 'target.value');
    const isValid = isValidJson(value);
    setIsInvalid(!isValid);
    onParamsChange('json', agg, value, { isValid });
  };

  return (
    <EuiFormRow label={label} isInvalid={isInvalid} className="form-group">
      <EuiTextArea
        id={`visEditorRawJson${agg.id}`}
        isInvalid={isInvalid}
        onChange={onTextAreaChange}
        rows={2}
      />
    </EuiFormRow>
  );
}

export { RawJSONSelect };
