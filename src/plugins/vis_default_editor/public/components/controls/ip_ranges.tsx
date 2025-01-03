/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
