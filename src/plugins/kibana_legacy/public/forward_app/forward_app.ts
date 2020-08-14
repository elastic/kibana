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

import { App, AppMountParameters, CoreSetup } from 'kibana/public';
import { AppNavLinkStatus } from '../../../../core/public';
import { navigateToLegacyKibanaUrl } from './navigate_to_legacy_kibana_url';
import { ForwardDefinition, KibanaLegacyStart } from '../plugin';

export const createLegacyUrlForwardApp = (
  core: CoreSetup<{}, KibanaLegacyStart>,
  forwards: ForwardDefinition[]
): App => ({
  id: 'kibana',
  chromeless: true,
  title: 'Legacy URL migration',
  navLinkStatus: AppNavLinkStatus.hidden,
  async mount(params: AppMountParameters) {
    const hash = params.history.location.hash.substr(1);

    if (!hash) {
      const [, , kibanaLegacyStart] = await core.getStartServices();
      kibanaLegacyStart.navigateToDefaultApp();
    }

    const [
      {
        application,
        http: { basePath },
      },
    ] = await core.getStartServices();

    const result = await navigateToLegacyKibanaUrl(hash, forwards, basePath, application);

    if (!result.navigated) {
      const [, , kibanaLegacyStart] = await core.getStartServices();
      kibanaLegacyStart.navigateToDefaultApp();
    }

    return () => {};
  },
});
