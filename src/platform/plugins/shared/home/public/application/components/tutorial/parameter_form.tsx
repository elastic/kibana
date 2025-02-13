/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { NumberParameter } from './number_parameter';
import { StringParameter } from './string_parameter';

export interface ParameterFormParam {
  label: string;
  type: 'string' | 'number';
  id: string;
}
export interface ParameterFormProps {
  param: ParameterFormParam;
  paramValues: { [key: string]: number | string };
  setParameter: (id: string, value: any) => void;
}
export class ParameterForm extends React.Component<ParameterFormProps> {
  renderInputs = () => {
    const { param } = this.props;
    switch (param.type) {
      case 'number':
        return (
          <NumberParameter
            key={param.id}
            id={param.id}
            label={param.label}
            value={Number(this.props.paramValues[param.id])}
            setParameter={this.props.setParameter}
          />
        );
      case 'string':
        return (
          <StringParameter
            key={param.id}
            id={param.id}
            label={param.label}
            value={String(this.props.paramValues[param.id])}
            setParameter={this.props.setParameter}
          />
        );
      default:
        throw new Error(`Unhandled parameter type ${param.type}`);
    }
  };

  render() {
    return <EuiPanel>{this.renderInputs()}</EuiPanel>;
  }
}
