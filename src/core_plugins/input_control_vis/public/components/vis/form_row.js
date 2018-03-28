import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';

import {
  EuiFormRow,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';

export class FormRow extends Component {

  renderControl() {
    if (!this.props.control.isEnabled()) {
      return (
        <EuiToolTip placement="top" content={this.props.control.disabledReason}>
          {this.props.children}
        </EuiToolTip>
      );
    }

    return this.props.children;
  }

  renderLabel() {
    if (!this.props.control.warning || this.props.control.warning.length === 0) {
      return this.props.label;
    }

    return (
      <Fragment>
        {`${this.props.label} `}
        <EuiIconTip
          content={this.props.control.warning}
          position="right"
          type="alert"
          aria-label="Warning"
        />
      </Fragment>
    );
  }

  render() {
    return (
      <EuiFormRow
        label={this.renderLabel()}
        id={this.props.id}
        data-test-subj={'inputControl' + this.props.controlIndex}
      >
        {this.renderControl()}
      </EuiFormRow>
    );
  }
}

FormRow.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  controlIndex: PropTypes.number.isRequired,
  control: PropTypes.object.isRequired,
};
