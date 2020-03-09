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
import { EuiFormRow, EuiFieldText, EuiSwitch } from '@elastic/eui';
import { ActionDefinition } from '../../actions';
import { CollectConfigProps } from '../../util';
import { reactToUiComponent } from '../../../../kibana_react/public';

export const SAMPLE_GO_TO_URL_ACTION = 'SAMPLE_GO_TO_URL_ACTION' as ActionDefinition['type'];

interface Config {
  url: string;
  openInNewTab: boolean;
}

const CollectConfig: React.FC<CollectConfigProps<Config, object>> = ({ config, onConfig }) => {
  return (
    <>
      <EuiFormRow label="Enter target URL">
        <EuiFieldText
          placeholder="Enter URL"
          name="url"
          value={config.url}
          onChange={event => onConfig({ ...config, url: event.target.value })}
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="switch"
          label="Open in new tab?"
          checked={config.openInNewTab}
          onChange={() => onConfig({ ...config, openInNewTab: !config.openInNewTab })}
        />
      </EuiFormRow>
    </>
  );
};

export const createSampleGoToUrlAction = (): ActionDefinition<object, Config> => {
  return {
    type: SAMPLE_GO_TO_URL_ACTION,
    id: SAMPLE_GO_TO_URL_ACTION as string,
    async execute() {},
    defaultConfig: {
      url: '',
      openInNewTab: false,
    },
    CollectConfig: reactToUiComponent(CollectConfig),
  };
};
