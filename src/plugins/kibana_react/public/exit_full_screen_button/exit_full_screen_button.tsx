/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
