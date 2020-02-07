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

import * as React from 'react';
import { KibanaServices } from '../context/types';
import { KibanaReactOverlays } from './types';
import { toMountPoint } from '../util';

export const createReactOverlays = (services: KibanaServices): KibanaReactOverlays => {
  const checkCoreService = () => {
    if (!services.overlays) {
      throw new TypeError('Could not show overlay as overlays service is not available.');
    }
  };

  const openFlyout: KibanaReactOverlays['openFlyout'] = (node, options?) => {
    checkCoreService();
    return services.overlays!.openFlyout(toMountPoint(<>{node}</>), options);
  };

  const openModal: KibanaReactOverlays['openModal'] = (node, options?) => {
    checkCoreService();
    return services.overlays!.openModal(toMountPoint(<>{node}</>), options);
  };

  const overlays: KibanaReactOverlays = {
    openFlyout,
    openModal,
  };

  return overlays;
};
