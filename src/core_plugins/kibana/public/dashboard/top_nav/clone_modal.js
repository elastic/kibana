import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiModal,
  KuiModalHeader,
  KuiModalHeaderTitle,
  KuiModalBody,
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

  render() {
    return (
      <KuiModalOverlay>
        <KuiModal
          data-tests-subj="dashboardCloneModal"
          className="dashboardCloneModal"
          onClose={this.props.onClose}
        >
          <KuiModalHeader>
            <KuiModalHeaderTitle>
              Clone Dashboard
            </KuiModalHeaderTitle>
          </KuiModalHeader>

          <KuiModalBody>
            <p className="kuiText kuiVerticalRhythm">
              Please enter a new name for your dashboard.
            </p>

            <div className="kuiVerticalRhythm">
              <input
                autoFocus
                data-test-subj="clonedDashboardTitle"
                className="kuiTextInput kuiTextInput--large"
                value={this.state.newDashboardName}
                onChange={this.onInputChange}
              />
            </div>
          </KuiModalBody>

          <KuiModalFooter>
            <KuiButton
              buttonType="hollow"
              data-test-subj="cloneCancelButton"
              onClick={this.props.onClose}
            >
              Cancel
            </KuiButton>

            <KuiButton
              buttonType="primary"
              data-test-subj="cloneConfirmButton"
              onClick={this.cloneDashboard}
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
