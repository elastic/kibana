import { get, pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { FunctionForm } from './function_form';

const NO_NEXT_EXP = 'no next expression';
const NO_MODEL_ARGS = 'no model args';

function getModelArgs(expressionType) {
  if (!expressionType) return NO_NEXT_EXP;
  if (!expressionType.modelArgs) return NO_MODEL_ARGS;
  return (expressionType.modelArgs.length > 0) ? expressionType.modelArgs : NO_MODEL_ARGS;
}

export class Model extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }

  resolveArg(dataArg, props) {
    // custom argument resolver
    // uses `modelArgs` from following expression to control which arguments get rendered
    const { nextExpressionType } = props;
    const modelArgs = getModelArgs(nextExpressionType);

    // if modelArgs is false, something went wrong here
    if (modelArgs === NO_MODEL_ARGS) {
      // if there is a next expression, it is lacking modelArgs, so we throw
      throw new Error(`${nextExpressionType.displayName} modelArgs Error:
        The modelArgs value is empty. Either it should contain an arg,
        or a model should not be used in the expression.
      `);
    }

    // if argument is missing from modelArgs, mark it as skipped
    return {
      skipRender: modelArgs !== NO_NEXT_EXP && !modelArgs.includes(get(dataArg, 'arg.name')),
    };
  }
}

class ModelRegistry extends Registry {
  wrapper(obj) {
    return new Model(obj);
  }
}

export const modelRegistry = new ModelRegistry();
