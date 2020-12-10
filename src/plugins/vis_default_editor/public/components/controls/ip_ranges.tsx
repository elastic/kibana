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

import React, { useCallback } from 'react';
import { EuiFormRow } from '@elastic/eui';

import { FromToList, FromToObject } from './components/from_to_list';
import { MaskList, MaskObject } from './components/mask_list';
import { IpRangeTypes } from './ip_range_type';
import { AggParamEditorProps } from '../agg_param_props';

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
  const handleMaskListChange = useCallback(
    (items: MaskObject[]) =>
      setValue({
        ...value,
        [IpRangeTypes.MASK]: items,
      }),
    [setValue, value]
  );
  const handleFromToListChange = useCallback(
    (items: FromToObject[]) =>
      setValue({
        ...value,
        [IpRangeTypes.FROM_TO]: items,
      }),
    [setValue, value]
  );

  return (
    <EuiFormRow fullWidth={true} id={`visEditorIpRange${agg.id}`} display="rowCompressed">
      {agg.params.ipRangeType === IpRangeTypes.MASK ? (
        <MaskList
          list={value.mask}
          showValidation={showValidation}
          onBlur={setTouched}
          onChange={handleMaskListChange}
          setValidity={setValidity}
        />
      ) : (
        <FromToList
          list={value.fromTo}
          showValidation={showValidation}
          onBlur={setTouched}
          onChange={handleFromToListChange}
          setValidity={setValidity}
        />
      )}
    </EuiFormRow>
  );
}

export { IpRangesParamEditor };
