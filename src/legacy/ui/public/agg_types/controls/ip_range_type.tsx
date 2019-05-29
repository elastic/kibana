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

import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from '../../vis/editors/default';

enum IpRangeTypes {
  MASK = 'mask',
  FROM_TO = 'fromTo',
}

function IpRangeTypeParamEditor({ value, setValue }: AggParamEditorProps<IpRangeTypes>) {
  const options = [
    {
      id: IpRangeTypes.FROM_TO,
      label: i18n.translate('common.ui.aggTypes.ipRanges.fromToButtonLabel', {
        defaultMessage: 'From/to',
      }),
    },
    {
      id: IpRangeTypes.MASK,
      label: i18n.translate('common.ui.aggTypes.ipRanges.cidrMasksButtonLabel', {
        defaultMessage: 'CIDR masks',
      }),
    },
  ];

  const onClick = (optionId: string) => {
    setValue(optionId as IpRangeTypes);
  };

  return (
    <>
      <EuiButtonGroup
        isFullWidth={true}
        onChange={onClick}
        idSelected={value}
        options={options}
        legend={i18n.translate('common.ui.aggTypes.ipRangesAriaLabel', {
          defaultMessage: 'IP ranges',
        })}
      />
      <EuiSpacer size="s" />
    </>
  );
}

export { IpRangeTypeParamEditor, IpRangeTypes };
