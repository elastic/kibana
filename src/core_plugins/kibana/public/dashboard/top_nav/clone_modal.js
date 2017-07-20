import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiModal,
  KuiModalHeader,
  KuiModalHeaderTitle,
  KuiModalBody,
  KuiModalBodyText,
  KuiModalFooter,
  KuiButton,
  KuiModalOverlay
} from 'ui_framework/components';

export class DashboardCloneModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newDashboardName: props.title
    };
  }

  cloneDashboard = () => {
    this.props.onClone(this.state.newDashboardName);
  };

  onInputChange = (event) => {
    this.setState({ newDashboardName: event.target.value });
  };

  onKeyDown = (event) => {
    if (event.keyCode === 27) { // ESC key
      this.props.onClose();
    }
  };

  render() {
    return (
      <KuiModalOverlay>
        <KuiModal
          data-tests-subj="dashboardCloneModal"
          aria-label="Clone a dashboard"
          className="dashboardCloneModal"
          onKeyDown={ this.onKeyDown }
        >
          <KuiModalHeader>
            <KuiModalHeaderTitle>
              Clone Dashboard
            </KuiModalHeaderTitle>
          </KuiModalHeader>
          <KuiModalBody>
            <KuiModalBodyText className="kuiVerticalRhythm">
              Please enter a new name for your dashboard.
            </KuiModalBodyText>
            <KuiModalBodyText className="kuiVerticalRhythm">
              <input
                autoFocus
                data-test-subj="clonedDashboardTitle"
                className="kuiTextInput kuiTextInput--large"
                value={ this.state.newDashboardName }
                onChange={ this.onInputChange } />
            </KuiModalBodyText>
          </KuiModalBody>

          <KuiModalFooter>
            <KuiButton
              buttonType="hollow"
              data-test-subj="cloneCancelButton"
              onClick={ this.props.onClose }
            >
              Cancel
            </KuiButton>
            <KuiButton
              buttonType="primary"
              data-test-subj="cloneConfirmButton"
              onClick={ this.cloneDashboard }
            >
              Confirm Clone
            </KuiButton>
          </KuiModalFooter>
        </KuiModal>
      </KuiModalOverlay>
    );
  }
}

DashboardCloneModal.propTypes = {
  onClone: PropTypes.func,
  onClose: PropTypes.func,
  title: PropTypes.string
};
