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

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import chrome from 'ui/chrome';

import {
  KuiButton,
} from '@kbn/ui-framework/components';

import {
  keyCodes,
  EuiScreenReaderOnly,
} from '@elastic/eui';

export class ExitFullScreenButton extends PureComponent {

  onKeyDown = (e) => {
    if (e.keyCode === keyCodes.ESCAPE) {
      this.props.onExitFullScreenMode();
    }
  };

  componentWillMount() {
    document.addEventListener('keydown', this.onKeyDown, false);
    chrome.setVisible(false);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown, false);
    chrome.setVisible(true);
  }

  render() {
    return (
      <div>
        <EuiScreenReaderOnly>
          <p aria-live="polite">
            In full screen mode, press ESC to exit.
          </p>
        </EuiScreenReaderOnly>
        <div
          className="exitFullScreenButton"
        >
          <KuiButton
            type="hollow"
            aria-label="Exit full screen mode"
            className="exitFullScreenMode"
            onClick={this.props.onExitFullScreenMode}
          >
            <span className="exitFullScreenModeLogo" data-test-subj="exitFullScreenModeLogo"/>
            <span className="exitFullScreenModeText" data-test-subj="exitFullScreenModeText">
              Exit full screen
              <span className="kuiIcon fa fa-angle-left"/>
            </span>
          </KuiButton>
        </div>
      </div>
    );
  }
}

ExitFullScreenButton.propTypes = {
  onExitFullScreenMode: PropTypes.func.isRequired,
};
