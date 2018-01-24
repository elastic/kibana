import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

export class WorkpadCreate extends React.PureComponent {
  static propTypes = {
    onCreate: PropTypes.func.isRequired,
  };

  state = {
    createPending: false,
  };

  create = () => {
    this.setState({ createPending: true });
    this.props.onCreate();
  };

  render() {
    const { createPending } = this.state;

    return (
      <Button
        bsSize="xsmall"
        bsStyle="primary"
        onClick={this.create}
        disabled={createPending}
        className="canvas__workpad_loader--new"
      >
        {createPending && <i className="fa fa-spinner fa-pulse" />}
        {!createPending && <i className="fa fa-plus" />}
        &nbsp;New Workpad
      </Button>
    );
  }
}
