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

import { legacyChrome, npSetup, npStart } from './legacy_imports';
import { VisualizePlugin } from './plugin';
import { start as embeddables } from '../../../embeddable_api/public/np_ready/public/legacy';
import { start as visualizations } from '../../../visualizations/public/np_ready/public/legacy';

export * from './np_ready/visualize_constants';
export { showNewVisModal } from './np_ready/wizard';

(() => {
  const instance = new VisualizePlugin();
  instance.setup(npSetup.core, {
    ...npSetup.plugins,
    __LEGACY: {
      legacyChrome,
    },
  });
  instance.start(npStart.core, {
    ...npStart.plugins,
    embeddables,
    visualizations,
  });
})();

export { createSavedVisLoader } from './saved_visualizations/saved_visualizations';
