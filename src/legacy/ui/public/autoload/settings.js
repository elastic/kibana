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

/**
 * Autoload this file if we want some of the top level settings applied to a plugin.
 * Currently this file makes sure the following settings are applied globally:
 * - dateFormat:tz (meaning the Kibana time zone will be used in your plugin)
 * - dateFormat:dow (meaning the Kibana configured start of the week will be used in your plugin)
 */

import moment from 'moment-timezone';
import chrome from '../chrome';

function setDefaultTimezone(tz) {
  moment.tz.setDefault(tz);
}

function setStartDayOfWeek(day) {
  const dow = moment.weekdays().indexOf(day);
  moment.updateLocale(moment.locale(), { week: { dow } });
}

const uiSettings = chrome.getUiSettingsClient();

setDefaultTimezone(uiSettings.get('dateFormat:tz'));
setStartDayOfWeek(uiSettings.get('dateFormat:dow'));

uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
  if (key === 'dateFormat:tz') {
    setDefaultTimezone(newValue);
  } else if (key === 'dateFormat:dow') {
    setStartDayOfWeek(newValue);
  }
});
