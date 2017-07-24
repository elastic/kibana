import React from 'react';
import { Alert } from 'react-bootstrap';
import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { ArgForm } from './arg_form';

function getModelArgs(expressionType) {
  if (!expressionType || !expressionType.modelArgs) return false;
  return (expressionType.modelArgs.length > 0) ? expressionType.modelArgs : false;
}

export class Model extends ArgForm {
  constructor(name, props) {
    super(name, props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }

  renderArgs(props, dataArgs) {
    // custom renderer uses `modelArgs` from following expression to control
    // which arguments get rendered
    let hasError = false;
    const { nextExpressionType } = props;
    const modelArgs = getModelArgs(nextExpressionType);

    return dataArgs.reduce((acc, dataArg) => {
      // short-circuit logic, always show error dialog
      if (hasError) return acc;

      // if modelArgs is false, something went wrong here
      if (modelArgs === false) {
        hasError = true;
        // TODO: use a better looking Error component for this message
        if (!nextExpressionType) return;
        return (
          <Alert bsStyle="danger">
            <h4>{ nextExpressionType.displayName } modelArgs Error</h4>
            The modelArgs value is empty. Either it should contain an arg,
            or a model should not be used in the expression.
          </Alert>
        );
      }

      // if argument is in modelArgs, render it
      return acc.concat(this.renderArg(props, {
        ...dataArg,
        skipRender: !modelArgs.includes(dataArg.argName),
      }));

      return acc;
    }, []);
  }
}

export const modelRegistry = new Registry();
