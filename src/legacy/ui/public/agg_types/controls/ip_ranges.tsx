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

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AggParamEditorProps } from 'ui/vis/editors/default';
import { FromToList, FromToObject } from './components/from_to_list';
import { IpRangeTypes } from './ip_range_type';
interface IpRange {
  fromTo: FromToObject[];
  mask: Array<{ mask: string }>;
}

function IpRangesParamEditor({ agg, value, setValue, setValidity }: AggParamEditorProps<IpRange>) {
  const isValid = true;
  const labels = (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem className="euiFormLabel">
        <FormattedMessage id="common.ui.aggTypes.ipRanges.fromLabel" defaultMessage="From" />
      </EuiFlexItem>
      <EuiFlexItem className="euiFormLabel">
        <FormattedMessage id="common.ui.aggTypes.ipRanges.toLabel" defaultMessage="To" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  useEffect(
    () => {
      setValidity(isValid);

      return () => setValidity(true);
    },
    [isValid]
  );

  const handleChange = (modelName: IpRangeTypes, items: FromToObject[]) => {
    setValue({
      ...value,
      [modelName]: items,
    });
  };

  const onAdd = () => {
    const type = agg.params.ipRangeType;
    setValue({ ...value, [type]: [...value[type], {}] });
  };

  return (
    <EuiFormRow fullWidth={true}>
      <>
        {labels}
        {agg.params.ipRangeType === IpRangeTypes.FROM_TO ? (
          <FromToList
            labelledbyId={`visEditorIpRangeFromLabel${agg.id}`}
            list={value.fromTo}
            onChange={items => handleChange(IpRangeTypes.FROM_TO, items)}
          />
        ) : null}
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiButton fill={true} fullWidth={true} onClick={onAdd} size="s">
            <FormattedMessage
              id="common.ui.aggTypes.ipRanges.addRangeButtonLabel"
              defaultMessage="Add Range"
            />
          </EuiButton>
        </EuiFlexItem>
      </>
    </EuiFormRow>
  );
}

export { IpRangesParamEditor };
