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

import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from '../../vis/editors/default';

enum IpRangeTypes {
  MASK = 'mask',
  FROM_TO = 'fromTo',
}

function IpRangeTypeParamEditor({ value, setValue }: AggParamEditorProps<IpRangeTypes>) {
  const useFromToLabel = i18n.translate('common.ui.aggTypes.ipRanges.useFromToButtonLabel', {
    defaultMessage: 'Use From/To',
  });
  const useCidrMasksLabel = i18n.translate('common.ui.aggTypes.ipRanges.useCidrMasksButtonLabel', {
    defaultMessage: 'Use CIDR Masks',
  });

  const onClick = () => {
    setValue(value === IpRangeTypes.MASK ? IpRangeTypes.FROM_TO : IpRangeTypes.MASK);
  };

  return (
    <>
      <EuiButton onClick={onClick}>
        {value === IpRangeTypes.MASK ? useFromToLabel : useCidrMasksLabel}
      </EuiButton>
      <EuiSpacer size="s" />
    </>
  );
}

export { IpRangeTypeParamEditor, IpRangeTypes };
