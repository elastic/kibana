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

import chrome from 'ui/chrome';
import { filter } from 'rxjs/operators';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

// All Kibana styles inside of the /styles dir
const context = require.context('../styles', false, /[\/\\](?!mixins|variables|_|\.|bootstrap_(light|dark))[^\/\\]+\.less/);
context.keys().forEach(key => context(key));

// manually require non-less files
import '../styles/disable_animations';

chrome.getUiSettingsClient()
  .getSaved$()
  .pipe(filter(update => update.key === 'theme:darkMode'))
  .subscribe(() => {
    toastNotifications.addSuccess(i18n.translate('common.ui.styles.themeAppliedToast', {
      defaultMessage: 'Theme applied, please refresh your browser to take affect.'
    }));
  });
