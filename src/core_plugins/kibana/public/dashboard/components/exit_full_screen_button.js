import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import chrome from 'ui/chrome';

import {
  KuiButton,
} from '@kbn/ui-framework/components';

import {
  keyCodes,
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
    );
  }
}

ExitFullScreenButton.propTypes = {
  onExitFullScreenMode: PropTypes.func.isRequired,
};
