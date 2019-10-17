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
// @ts-ignore
import { banners } from 'ui/notify';
// @ts-ignore
import { clickBanner } from './click_banner';
import { OptInBanner } from '../opt_in_banner_component';
import { TelemetryOptInService } from '../../services';

export function renderBanner(
  telemetryOptInService: TelemetryOptInService,
  { _banners = banners } = {}
): void {
  const shouldShowBanner = telemetryOptInService.getShouldShowBanner();
  if (!shouldShowBanner) {
    return;
  }
  const bannerId = _banners.add({
    component: (
      <OptInBanner
        optInClick={optIn => clickBanner(telemetryOptInService, optIn)}
        fetchTelemetry={telemetryOptInService.fetchExample}
      />
    ),
    priority: 10000,
  });

  telemetryOptInService.setBannerId(bannerId);
}
