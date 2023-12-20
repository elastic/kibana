/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { PrefixLengthObject } from './components/prefix_length';
import { IsIpv6Object } from './components/is_ipv6';
import { AggParamEditorProps } from '../agg_param_props';

interface IpPrefix {
  prefixLength: PrefixLengthObject;
  isIpv6: IsIpv6Object;
}

function IpPrefixParamEditor({
  agg,
  value = { prefixLength: PrefixLengthObject, isIpv6: IsIpv6Object },
  setTouched,
  setValue,
  setValidity,
  showValidation,
}: AggParamEditorProps<IpPrefix>) {
  /*
  const handleIsIpv6Change = useCallback(
    (items: IsIpv6Object[]) =>
      setValue({
        ...value,
        [IpPrefixType.MASK]: items,
      }),
    [setValue, value]
  );
  */


  return (
    <>
      <PrefixLengthObject
        value={value}
        showValidation={showValidation}
        onBlur={setTouched}
        setValidity={setValidity}
      />
      <IsIpv6Object
        value={value}
        showValidation={showValidation}
        onBlur={setTouched}
        //onChange={handleMaskListChange}
        setValidity={setValidity}
      />
    </>
  );
}

export { IpPrefixParamEditor };
