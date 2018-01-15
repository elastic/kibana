import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiFieldText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

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
      <EuiOverlayMask>
        <EuiModal
          data-tests-subj="dashboardCloneModal"
          className="dashboardCloneModal"
          onClose={this.props.onClose}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              Clone Dashboard
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText>
              <p>
                Please enter a new name for your dashboard.
              </p>
            </EuiText>

            <EuiSpacer />

            <EuiFieldText
              autoFocus
              data-test-subj="clonedDashboardTitle"
              value={this.state.newDashboardName}
              onChange={this.onInputChange}
            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton
              data-test-subj="cloneCancelButton"
              onClick={this.props.onClose}
            >
              Cancel
            </EuiButton>

            <EuiButton
              fill
              data-test-subj="cloneConfirmButton"
              onClick={this.cloneDashboard}
            >
              Confirm Clone
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }
}

DashboardCloneModal.propTypes = {
  onClone: PropTypes.func,
  onClose: PropTypes.func,
  title: PropTypes.string
};
