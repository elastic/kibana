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
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { AppPluginDependencies } from './types';
import { StateDemoApp } from './components/app';
import { createKbnUrlStateStorage } from '../../../../src/plugins/kibana_utils/public/';

export const renderApp = (
  { notifications, http }: CoreStart,
  { navigation, data }: AppPluginDependencies,
  { element, history }: AppMountParameters
) => {
  const kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });

  ReactDOM.render(
    <StateDemoApp
      notifications={notifications}
      http={http}
      navigation={navigation}
      data={data}
      history={history}
      kbnUrlStateStorage={kbnUrlStateStorage}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
