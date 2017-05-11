import React from 'react';
import { Alert } from 'react-bootstrap';
import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { BaseRenderable } from './base_renderable';

function getModelArgs(expressionType) {
  if (!expressionType || !expressionType.modelArgs) return false;
  return (expressionType.modelArgs.length > 0) ? expressionType.modelArgs : false;
}

export class Model extends BaseRenderable {
  constructor(name, props) {
    super(name, props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }

  renderArgs(props, args) {
    let hasError = false;
    const { nextExpressionType } = props.data;
    const modelArgs = getModelArgs(nextExpressionType);

    return args.reduce((acc, arg) => {
      // short-circuit logic, always show error dialog
      if (hasError) return acc;

      // if modelArgs is false, something went wrong here
      if (modelArgs === false) {
        hasError = true;
        // TODO: use a better looking Error component for this message
        return (
          <Alert bsStyle="danger">
            <h4>{ nextExpressionType.displayName } modelArgs Error</h4>
            The modelArgs value is empty. Either it should contain an arg, or a model should not be used.
          </Alert>
        );
      }

      // if argument is in modelArgs, render it
      if (modelArgs.includes(arg.name)) {
        return acc.concat(this.renderArg(props, arg));
      }

      return acc;
    }, []);
  }
}

export const modelRegistry = new Registry();
