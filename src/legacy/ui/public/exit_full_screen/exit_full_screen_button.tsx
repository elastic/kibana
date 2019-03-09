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

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import React, { PureComponent } from 'react';
import chrome from 'ui/chrome';

// @ts-ignore
import { KuiButton } from '@kbn/ui-framework/components';

import { EuiScreenReaderOnly, keyCodes } from '@elastic/eui';

interface Props extends ReactIntl.InjectedIntlProps {
  onExitFullScreenMode: () => void;
}

class ExitFullScreenButtonUi extends PureComponent<Props> {
  public onKeyDown = (e: KeyboardEvent) => {
    if (e.keyCode === keyCodes.ESCAPE) {
      this.props.onExitFullScreenMode();
    }
  };

  public componentWillMount() {
    document.addEventListener('keydown', this.onKeyDown, false);
    chrome.setVisible(false);
  }

  public componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown, false);
    chrome.setVisible(true);
  }

  public render() {
    const { intl } = this.props;

    return (
      <div>
        <EuiScreenReaderOnly>
          <p aria-live="polite">
            <FormattedMessage
              id="common.ui.exitFullScreenButton.fullScreenModeDescription"
              defaultMessage="In full screen mode, press ESC to exit."
            />
          </p>
        </EuiScreenReaderOnly>
        <div className="dshExitFullScreenButton">
          <KuiButton
            type="hollow"
            aria-label={intl.formatMessage({
              id: 'common.ui.exitFullScreenButton.exitFullScreenModeButtonAreaLabel',
              defaultMessage: 'Exit full screen mode',
            })}
            className="dshExitFullScreenButton__mode"
            onClick={this.props.onExitFullScreenMode}
          >
            <span
              className="dshExitFullScreenButton__logo"
              data-test-subj="exitFullScreenModeLogo"
            />
            <span className="dshExitFullScreenButton__text" data-test-subj="exitFullScreenModeText">
              <FormattedMessage
                id="common.ui.exitFullScreenButton.exitFullScreenModeButtonLabel"
                defaultMessage="Exit full screen"
              />
              <span className="kuiIcon fa fa-angle-left" />
            </span>
          </KuiButton>
        </div>
      </div>
    );
  }
}

export const ExitFullScreenButton = injectI18n(ExitFullScreenButtonUi);
