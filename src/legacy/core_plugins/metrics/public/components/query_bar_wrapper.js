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

import { QueryBarInput } from 'plugins/data';
import { npSetup } from 'ui/new_platform';
import { Storage } from 'ui/storage';

const APP_NAME = 'VisEditor';

const queryBarInputContext = {
  appName: APP_NAME,
  uiSettings: npSetup.core.uiSettings,
  store: new Storage(window.localStorage),
};

export function QueryBarWrapper(props) {
  // Note: if you want to use your previous approach based on
  // React Context you can get it here like e.g. :

  // queryBarInputContext = useContext(QueryInputBarContext);

  // but now I don't see any reasons to use context

  return <QueryBarInput {...props} {...queryBarInputContext} />;
}
