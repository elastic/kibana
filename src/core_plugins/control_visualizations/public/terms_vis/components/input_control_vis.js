import React, { Component, PropTypes } from 'react';
import { TermsControl } from './terms_control';

export class InputControlVis extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="vertical-layout">
        {this.props.controls.map((control, index) => {
          return (
            <TermsControl
              key={index}
              control={control}
              setFilter={this.props.setFilter}
              removeFilter={this.props.removeFilter}
            />
          );
        }
        )}
      </div>
    );
  }
}

InputControlVis.propTypes = {
  setFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired
};
