import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { ArgForm } from './arg_form';

const NO_NEXT_EXP = 'no next expression';
const NO_MODEL_ARGS = 'no model args';

function getModelArgs(expressionType) {
  if (!expressionType) return NO_NEXT_EXP;
  if (!expressionType.modelArgs) return NO_MODEL_ARGS;
  return (expressionType.modelArgs.length > 0) ? expressionType.modelArgs : NO_MODEL_ARGS;
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

  resolveArgs(dataArgs, props) {
    // custom argument resolver
    // uses `modelArgs` from following expression to control which arguments get rendered
    const { nextExpressionType } = props;
    const modelArgs = getModelArgs(nextExpressionType);

    return dataArgs.map((dataArg) => {
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
        ...dataArg,
        skipRender: modelArgs !== NO_NEXT_EXP && !modelArgs.includes(dataArg.argName),
      };
    }).filter(Boolean);
  }
}

export const modelRegistry = new Registry();
