/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import PropTypes from 'prop-types';
import { NumberParameter } from './number_parameter';
import { StringParameter } from './string_parameter';
import { EuiPanel } from '@elastic/eui';

export class ParameterForm extends React.Component {
  renderInputs = () => {
    return this.props.params.map((param) => {
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
  };

  render() {
    return <EuiPanel>{this.renderInputs()}</EuiPanel>;
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
  setParameter: PropTypes.func.isRequired,
};
