import { connect } from 'react-redux';
import { get } from 'lodash';
import { ArgTypes as Component } from './arg_types';
import { modelRegistry, viewRegistry } from '../../expression_types';
import { getSelectedElement } from '../../state/selectors/workpad';
import { toExpression } from '../../../common/lib/ast';

function getExpression(chain) {
  if (!Array.isArray(chain) || !chain.length) return null;

  return toExpression({
    type: 'expression',
    chain,
  });
}

const mapStateToProps = (state) => {
  const selectedElement = getSelectedElement(state);
  const argTypeChain = get(selectedElement, 'ast.chain', []);

  // map argTypes from AST, attaching nextArgType if one exists
  const argTypeItems = argTypeChain.reduce((acc, argType, i) => {
    const inSidebar = modelRegistry.get(argType.function) || viewRegistry.get(argType.function);
    const prevContext = acc.context;
    const nextArg = argTypeChain[i + 1] || null;

    // filter out argTypes that shouldn't be in the sidebar
    if (inSidebar) {
      // wrap each part of the chain in ArgType, passing in the previous context
      const component = {
        args: argType.arguments,
        argType: argType.function,
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
    element: selectedElement,
    argTypeItems: argTypeItems.mapped,
  };
};

export const ArgTypes = connect(mapStateToProps)(Component);
