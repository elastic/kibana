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
import React, { PureComponent } from 'react';
import { EuiScreenReaderOnly, keys } from '@elastic/eui';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

export interface ExitFullScreenButtonProps {
  onExitFullScreenMode: () => void;
}

import './index.scss';

class ExitFullScreenButtonUi extends PureComponent<ExitFullScreenButtonProps> {
  public onKeyDown = (e: KeyboardEvent) => {
    if (e.key === keys.ESCAPE) {
      this.props.onExitFullScreenMode();
    }
  };

  public UNSAFE_componentWillMount() {
    document.addEventListener('keydown', this.onKeyDown, false);
  }

  public componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown, false);
  }

  public render() {
    return (
      <div>
        <EuiScreenReaderOnly>
          <p aria-live="polite">
            {i18n.translate('kibana-react.exitFullScreenButton.fullScreenModeDescription', {
              defaultMessage: 'In full screen mode, press ESC to exit.',
            })}
          </p>
        </EuiScreenReaderOnly>
        <div>
          <button
            aria-label={i18n.translate(
              'kibana-react.exitFullScreenButton.exitFullScreenModeButtonAriaLabel',
              {
                defaultMessage: 'Exit full screen mode',
              }
            )}
            className="dshExitFullScreenButton"
            onClick={this.props.onExitFullScreenMode}
            data-test-subj="exitFullScreenModeLogo"
          >
            <EuiFlexGroup component="span" responsive={false} alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoElastic" size="l" />
              </EuiFlexItem>
              <EuiFlexItem grow={false} data-test-subj="exitFullScreenModeText">
                <div>
                  <EuiText size="s" className="dshExitFullScreenButton__text">
                    <p>
                      {i18n.translate(
                        'kibana-react.exitFullScreenButton.exitFullScreenModeButtonText',
                        {
                          defaultMessage: 'Exit full screen',
                        }
                      )}
                    </p>
                  </EuiText>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="fullScreen" className="dshExitFullScreenButton__icon" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </button>
        </div>
      </div>
    );
  }
}

export const ExitFullScreenButton = ExitFullScreenButtonUi;
