import { compose, withProps } from 'recompose';
import { get } from 'lodash';
import { FunctionFormList as Component } from './function_form_list';
import { modelRegistry, viewRegistry } from '../../expression_types';
import { toExpression } from '../../../common/lib/ast';

function getExpression(chain) {
  if (!Array.isArray(chain) || !chain.length) return null;

  return toExpression({
    type: 'expression',
    chain,
  });
}

const functionFormItems = withProps(props => {
  const selectedElement = props.element;
  const FunctionFormChain = get(selectedElement, 'ast.chain', []);

  // map argTypes from AST, attaching nextArgType if one exists
  const FunctionFormListItems = FunctionFormChain.reduce((acc, argType, i) => {
    const argTypeDef = modelRegistry.get(argType.function) || viewRegistry.get(argType.function);
    const prevContext = acc.context;
    const nextArg = FunctionFormChain[i + 1] || null;

    // filter out argTypes that shouldn't be in the sidebar
    if (argTypeDef) {
      // wrap each part of the chain in ArgType, passing in the previous context
      const component = {
        args: argType.arguments,
        argType: argType.function,
        argTypeDef: argTypeDef,
        nextArgType: nextArg && nextArg.function,
        contextExpression: getExpression(prevContext),
        expressionIndex: i, // preserve the index in the AST
      };

      acc.mapped.push(component);
    }

    acc.context = acc.context.concat(argType);
    return acc;
  }, { mapped: [], context: [] });

  return {
    functionFormItems: FunctionFormListItems.mapped,
  };
});

export const FunctionFormList = compose(
  functionFormItems
)(Component);
