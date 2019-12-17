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

import { i18n } from '@kbn/i18n';
import uiRoutes from '../routes';
import { KbnUrlProvider } from '../url';

import template from './error_url_overflow.html';
import { UrlOverflowService } from './url_overflow_service';

export * from './url_overflow_service';

uiRoutes.when('/error/url-overflow', {
  template,
  k7Breadcrumbs: () => [
    {
      text: i18n.translate('common.ui.errorUrlOverflow.breadcrumbs.errorText', {
        defaultMessage: 'Error',
      }),
    },
  ],
  controllerAs: 'controller',
  controller: class OverflowController {
    constructor(Private, $scope) {
      const kbnUrl = Private(KbnUrlProvider);
      const urlOverflow = new UrlOverflowService();

      if (!urlOverflow.get()) {
        kbnUrl.redirectPath('/');
        return;
      }

      this.url = urlOverflow.get();
      this.limit = urlOverflow.failLength();
      this.advancedSettingsLabel = i18n.translate(
        'common.ui.errorUrlOverflow.howTofixError.enableOptionText.advancedSettingsLinkText',
        { defaultMessage: 'advanced settings' }
      );
      $scope.$on('$destroy', () => urlOverflow.clear());
    }
  },
});
