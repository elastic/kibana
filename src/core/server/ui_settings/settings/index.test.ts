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

import { getAccessibilitySettings } from './accessibility';
import { getDateFormatSettings } from './date_formats';
import { getMiscUiSettings } from './misc';
import { getNavigationSettings } from './navigation';
import { getNotificationsSettings } from './notifications';
import { getThemeSettings } from './theme';
import { getCoreSettings } from './index';
import { getStateSettings } from './state';

describe('getCoreSettings', () => {
  it('should not have setting overlaps', () => {
    const coreSettingsLength = Object.keys(getCoreSettings()).length;
    const summedLength = [
      getAccessibilitySettings(),
      getDateFormatSettings(),
      getMiscUiSettings(),
      getNavigationSettings(),
      getNotificationsSettings(),
      getThemeSettings(),
      getStateSettings(),
    ].reduce((sum, settings) => sum + Object.keys(settings).length, 0);

    expect(coreSettingsLength).toBe(summedLength);
  });
});
