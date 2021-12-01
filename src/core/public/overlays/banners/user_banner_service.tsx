/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiButton, EuiLoadingSpinner } from '@elastic/eui';

import { I18nStart } from '../../i18n';
import { IUiSettingsClient } from '../../ui_settings';
import { OverlayBannersStart } from './banners_service';

interface StartDeps {
  banners: OverlayBannersStart;
  i18n: I18nStart;
  uiSettings: IUiSettingsClient;
}

const ReactMarkdownLazy = React.lazy(() => import('react-markdown'));

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
        (el) => {
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
                <React.Suspense
                  fallback={
                    <div>
                      <EuiLoadingSpinner />
                    </div>
                  }
                >
                  <ReactMarkdownLazy renderers={{ root: Fragment }} source={content.trim()} />
                </React.Suspense>

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
