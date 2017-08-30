import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

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

export class ChangeIndexModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newIndexId: get(this.props, 'indices[0].id')
    };
  }

  changeIndex = () => {
    this.props.onChange(this.state.newIndexId);
  };

  onIndexChange = (event) => {
    this.setState({ newIndexId: event.target.value });
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
          data-tests-subj="managementChangeIndexModal"
          aria-label="Index does not exist"
          className="managementChangeIndexModal"
          onKeyDown={this.onKeyDown}
        >
          <KuiModalHeader>
            <KuiModalHeaderTitle>
              {this.props.objectTitle}
            </KuiModalHeaderTitle>
          </KuiModalHeader>
          <KuiModalBody>
            <KuiModalBodyText className="kuiVerticalRhythm">
              <p>An index with the ID of {this.props.currentIndexID} does not exist.</p>
              <p>Select an index below to use for this object.</p>
            </KuiModalBodyText>
            <KuiModalBodyText className="kuiVerticalRhythm">
              <select
                autoFocus
                className="kuiSelect kuiSelect--large"
                data-test-subj="managementChangeIndexSelection"
                value={this.state.newIndexId}
                onChange={this.onIndexChange}
              >

                {this.props.indices.map((index, i) => {
                  return (
                    <option key={i} value={index.id}>
                      {index.get('title')}
                    </option>
                  );
                })}
              </select>
            </KuiModalBodyText>
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
              onClick={this.changeIndex}
            >
              Confirm Change
            </KuiButton>
          </KuiModalFooter>
        </KuiModal>
      </KuiModalOverlay>
    );
  }
}

ChangeIndexModal.propTypes = {
  onChange: PropTypes.func,
  onClose: PropTypes.func,
  currentIndexID: PropTypes.string.isRequired,
  objectTitle: PropTypes.string.isRequired,
  indices: PropTypes.array
};
