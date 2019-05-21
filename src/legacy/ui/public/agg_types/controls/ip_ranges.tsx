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
import { EuiFlexItem, EuiFormRow, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AggParamEditorProps } from 'ui/vis/editors/default';
import { FromToList, FromToObject } from './components/from_to_list';
import { MaskList, MaskObject } from './components/mask_list';
import { IpRangeTypes } from './ip_range_type';
interface IpRange {
  fromTo: FromToObject[];
  mask: MaskObject[];
}

function IpRangesParamEditor({
  agg,
  value,
  setTouched,
  setValue,
  setValidity,
  showValidation,
}: AggParamEditorProps<IpRange>) {
  const isValid = true;

  useEffect(
    () => {
      setValidity(isValid);

      return () => setValidity(true);
    },
    [isValid]
  );

  const handleChange = (modelName: IpRangeTypes, items: Array<FromToObject | MaskObject>) => {
    setValue({
      ...value,
      [modelName]: items,
    });
  };

  const onAdd = () => {
    const type = agg.params.ipRangeType as IpRangeTypes;
    setValue({ ...value, [type]: [...value[type], {}] });
  };

  return (
    <EuiFormRow fullWidth={true}>
      <>
        {agg.params.ipRangeType === IpRangeTypes.MASK ? (
          <MaskList
            labelledbyId={agg.id}
            list={value.mask}
            showValidation={showValidation}
            onBlur={setTouched}
            onChange={items => handleChange(IpRangeTypes.MASK, items)}
          />
        ) : (
          <FromToList
            labelledbyId={agg.id}
            list={value.fromTo}
            showValidation={showValidation}
            onBlur={setTouched}
            onChange={items => handleChange(IpRangeTypes.FROM_TO, items)}
          />
        )}
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAdd} size="xs">
            <FormattedMessage
              id="common.ui.aggTypes.ipRanges.addRangeButtonLabel"
              defaultMessage="Add Range"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </>
    </EuiFormRow>
  );
}

export { IpRangesParamEditor };
