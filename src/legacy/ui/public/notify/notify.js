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
import { MarkdownSimple } from 'ui/markdown';
import { uiModules } from '../modules';
import { metadata } from '../metadata';
import { fatalError } from './fatal_error';
import { banners } from './banners';
import { Notifier } from './notifier';
import './filters/markdown';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';

const module = uiModules.get('kibana/notify');

export const notify = new Notifier();

// if kibana is not included then the notify service can't
// expect access to config (since it's dependent on kibana)
if (!!metadata.kbnIndex) {
  require('ui/config');
  module.run(function (config) {
    config.watchAll(() => applyConfig(config));
  });
}

let bannerId;
let bannerTimeoutId;

function applyConfig(config) {
  // Show user-defined banner.
  const bannerContent = config.get('notifications:banner');
  const bannerLifetime = config.get('notifications:lifetime:banner');

  if (typeof bannerContent === 'string' && bannerContent.trim()) {
    const BANNER_PRIORITY = 100;

    const dismissBanner = () => {
      banners.remove(bannerId);
      clearTimeout(bannerTimeoutId);
    };

    const banner = (
      <EuiCallOut
        title={(
          <FormattedMessage
            id="common.ui.notify.banner.attentionTitle"
            defaultMessage="Attention"
          />
        )}
        iconType="help"
      >
        <MarkdownSimple data-test-subj="userDefinedBanner">
          {bannerContent}
        </MarkdownSimple>

        <EuiButton type="primary" size="s" onClick={dismissBanner}>
          <FormattedMessage
            id="common.ui.notify.banner.closeButtonLabel"
            defaultMessage="Close"
          />
        </EuiButton>
      </EuiCallOut>
    );

    bannerId = banners.set({
      component: banner,
      id: bannerId,
      priority: BANNER_PRIORITY,
    });

    bannerTimeoutId = setTimeout(() => {
      dismissBanner();
    }, bannerLifetime);
  }
}

window.onerror = function (err, url, line) {
  fatalError(new Error(`${err} (${url}:${line})`));
  return true;
};

if (window.addEventListener) {
  window.addEventListener('unhandledrejection', function (e) {
    console.log(`Detected an unhandled Promise rejection.\n${e.reason}`); // eslint-disable-line no-console
  });
}

