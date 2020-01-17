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

import { banners } from 'ui/notify';
import { OptedInBanner } from '../../components/opted_in_notice_banner';

/**
 * Render the Telemetry Opt-in notice banner.
 *
 * @param {Object} telemetryOptInProvider The telemetry opt-in provider.
 * @param {Object} _banners Banners singleton, which can be overridden for tests.
 */
export function renderOptedInBanner(telemetryOptInProvider, { _banners = banners } = {}) {
  const bannerId = _banners.add({
    component: <OptedInBanner onSeenBanner={telemetryOptInProvider.setOptInNoticeSeen} />,
    priority: 10000,
  });

  telemetryOptInProvider.setOptInBannerNoticeId(bannerId);
}
