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
import { i18n } from '@kbn/i18n';
import { EuiCodeBlock } from '@elastic/eui';
import { OutputPaneVisualisationProps, OutputPaneVisualisationDescriptor } from '../types';
import { ESRequestResult } from '../../../hooks/use_send_current_request_to_es/send_request_to_es';

export const title = i18n.translate('console.visJsonOutputPane.title', { defaultMessage: 'JSON' });

export const isCompatible = ({ response: { value } }: ESRequestResult) => {
  if (typeof value === 'string') {
    try {
      const valueTrimmed = value.trim();
      return Boolean(valueTrimmed.startsWith('{') && JSON.parse(valueTrimmed));
    } catch (e) {
      return false;
    }
  }
  return false;
};

export const Json = ({ data, containerHeight, fontSize }: OutputPaneVisualisationProps) => {
  return (
    <EuiCodeBlock
      style={{ fontSize: fontSize + 'px' }}
      language="json"
      overflowHeight={containerHeight}
      paddingSize="none"
      isCopyable={true}
    >
      {data
        .map(({ response }) => {
          return response.value;
        })
        .join('\n')}
    </EuiCodeBlock>
  );
};

export const descriptor: OutputPaneVisualisationDescriptor = {
  Component: Json,
  isCompatible,
  title,
};
