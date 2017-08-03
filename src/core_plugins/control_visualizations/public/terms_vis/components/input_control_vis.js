import React, { Component, PropTypes } from 'react';
import { TermsControl } from './terms_control';
import { TextControl } from './text_control';

export class InputControlVis extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="vertical-layout">
        {this.props.controls.map((control, index) => {
          let controlComponent = null;
          switch (control.type) {
            case 'terms':
              controlComponent = (
                <TermsControl
                  control={control}
                  setFilter={this.props.setFilter}
                  removeFilter={this.props.removeFilter}
                />
              );
              break;
            case 'range':
              break;
            case 'text':
              controlComponent = (
                <TextControl
                  control={control}
                  setFilter={this.props.setFilter}
                  removeFilter={this.props.removeFilter}
                />
              );
          }
          return <div key={index}>{controlComponent}</div>;
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
