import React from 'react';
import PropTypes from 'prop-types';
import { NumberParameter } from './number_parameter';
import { StringParameter } from './string_parameter';

export class ParameterForm extends React.Component {

  renderInputs = () => {
    return this.props.params.map(param => {
      switch (param.type) {
        case 'number':
          return (
            <NumberParameter
              key={param.id}
              id={param.id}
              label={param.label}
              value={this.props.paramValues[param.id]}
              setParameter={this.props.setParameter}
            />
          );
        case 'string':
          return (
            <StringParameter
              key={param.id}
              id={param.id}
              label={param.label}
              value={this.props.paramValues[param.id]}
              setParameter={this.props.setParameter}
            />
          );
        default:
          throw new Error(`Unhandled parameter type ${param.type}`);
      }
    });
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

const paramsShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
});

ParameterForm.propTypes = {
  params: PropTypes.arrayOf(paramsShape).isRequired,
  paramValues: PropTypes.object.isRequired,
  setParameter: PropTypes.func.isRequired
};
