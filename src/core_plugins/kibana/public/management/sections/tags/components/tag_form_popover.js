import React, {
  cloneElement,
} from 'react';

import PropTypes from 'prop-types';
import { TagForm } from './tag_form';

import {
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';

export class TagFormPopover extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      show: false,
    };
  }

  onBtnClick = () => {
    this.setState({
      show: !this.state.show,
    });
  }

  close = () => {
    this.setState({
      show: false,
    });
  }

  onSuccess = () => {
    this.close();
    this.props.onSuccessfulSave();
  }

  render() {
    return (
      <EuiPopover
        id="tagFormPopover"
        ownFocus
        button={cloneElement(this.props.button, { onClick: this.onBtnClick })}
        isOpen={this.state.show}
        closePopover={this.close}
        anchorPosition={this.props.anchorPosition}
        withTitle
      >
        <EuiPopoverTitle>{this.props.formTitle}</EuiPopoverTitle>
        <TagForm
          tagSavedObject={this.props.tagSavedObject}
          onCancel={this.close}
          save={this.props.save}
          onSuccessfulSave={this.onSuccess}
        />
      </EuiPopover>
    );
  }
}

TagFormPopover.propTypes = {
  button: PropTypes.node.isRequired,
  formTitle: PropTypes.string.isRequired,
  tagSavedObject: PropTypes.object,
  savedObjectId: PropTypes.string,
  save: PropTypes.func.isRequired,
  onSuccessfulSave: PropTypes.func.isRequired,
  anchorPosition: PropTypes.string,
};
