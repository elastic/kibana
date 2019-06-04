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
import { EuiFormRow } from '@elastic/eui';

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
  value = { fromTo: [] as FromToObject[], mask: [] as MaskObject[] },
  setTouched,
  setValue,
  setValidity,
  showValidation,
}: AggParamEditorProps<IpRange>) {
  const handleChange = (modelName: IpRangeTypes, items: Array<FromToObject | MaskObject>) => {
    setValue({
      ...value,
      [modelName]: items,
    });
  };

  return (
    <EuiFormRow fullWidth={true} id={`visEditorIpRange${agg.id}`}>
      {agg.params.ipRangeType === IpRangeTypes.MASK ? (
        <MaskList
          list={value.mask}
          showValidation={showValidation}
          onBlur={setTouched}
          onChange={items => handleChange(IpRangeTypes.MASK, items)}
          setValidity={setValidity}
        />
      ) : (
        <FromToList
          list={value.fromTo}
          showValidation={showValidation}
          onBlur={setTouched}
          onChange={items => handleChange(IpRangeTypes.FROM_TO, items)}
          setValidity={setValidity}
        />
      )}
    </EuiFormRow>
  );
}

export { IpRangesParamEditor };
