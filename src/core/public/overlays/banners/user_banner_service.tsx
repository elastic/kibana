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

import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiButton } from '@elastic/eui';

import { I18nStart } from '../../i18n';
import { IUiSettingsClient } from '../../ui_settings';
import { OverlayBannersStart } from './banners_service';

interface StartDeps {
  banners: OverlayBannersStart;
  i18n: I18nStart;
  uiSettings: IUiSettingsClient;
}

/**
 * Sets up the custom banner that can be specified in advanced settings.
 * @internal
 */
export class UserBannerService {
  private settingsSubscription?: Subscription;

  public start({ banners, i18n, uiSettings }: StartDeps) {
    let id: string | undefined;
    let timeout: any;

    const dismiss = () => {
      banners.remove(id!);
      clearTimeout(timeout);
    };

    const updateBanner = () => {
      const content = uiSettings.get('notifications:banner');
      const lifetime = uiSettings.get('notifications:lifetime:banner');

      if (typeof content !== 'string' || content.length === 0 || typeof lifetime !== 'number') {
        dismiss();
        return;
      }

      id = banners.replace(
        id,
        el => {
          ReactDOM.render(
            <i18n.Context>
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="core.ui.overlays.banner.attentionTitle"
                    defaultMessage="Attention"
                  />
                }
                iconType="help"
              >
                <ReactMarkdown renderers={{ root: Fragment }}>{content.trim()}</ReactMarkdown>

                <EuiButton type="primary" size="s" onClick={() => banners.remove(id!)}>
                  <FormattedMessage
                    id="core.ui.overlays.banner.closeButtonLabel"
                    defaultMessage="Close"
                  />
                </EuiButton>
              </EuiCallOut>
            </i18n.Context>,
            el
          );

          timeout = setTimeout(dismiss, lifetime);

          return () => ReactDOM.unmountComponentAtNode(el);
        },
        100
      );
    };

    updateBanner();
    this.settingsSubscription = uiSettings
      .getUpdate$()
      .pipe(
        filter(
          ({ key }) => key === 'notifications:banner' || key === 'notifications:lifetime:banner'
        )
      )
      .subscribe(() => updateBanner());
  }

  public stop() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
      this.settingsSubscription = undefined;
    }
  }
}
