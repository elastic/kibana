import { createElement } from 'react';
import PropTypes from 'prop-types';
import { ArgType } from '../arg_type';

function wrapExpression(chain) {
  if (!Array.isArray(chain) || !chain.length) return null;

  return {
    type: 'expression',
    chain,
  };
}

export const ArgTypesComponent = ({ argTypeChain }) => {
  const argTypeItems = argTypeChain.reduce((acc, chain, i) => {
    const prevContext = acc.context;
    const nextArg = argTypeChain[i + 1] || null;

    // wrap each part of the chain in ArgType, passing in the previous context
    const component = createElement(ArgType, {
      key: `${chain.function}-${i}`,
      args: chain.arguments,
      argType: chain.function,
      nextArgType: nextArg && nextArg.function,
      expression: wrapExpression(prevContext),
      expressionIndex: i,
    });

    acc.components.push(component);
    acc.context = acc.context.concat(chain);
    return acc;
  }, { components: [], context: [] });

  return createElement('div', null, argTypeItems.components);
};

ArgTypesComponent.propTypes = {
  argTypeChain: PropTypes.array.isRequired,
};
