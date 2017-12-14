import React from 'react';
import PropTypes from 'prop-types';
import { Parameter } from './parameter';

export class ParameterForm extends React.Component {

  renderInputs = () => {
    return this.props.params.map(param => (
      <Parameter
        key={param.id}
        id={param.id}
        label={param.label}
        value={this.props.paramValues[param.id]}
        setParameter={this.props.setParameter}
      />
    ));
  }

  render() {
    return (
      <div>

        <div className="kuiSideBarSection">
          {this.renderInputs()}
        </div>

      </div>
    );
  }
}

ParameterForm.propTypes = {
  params: PropTypes.array.isRequired,
  paramValues: PropTypes.object.isRequired,
  setParameter: PropTypes.func.isRequired
};
