import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { ArgType } from '../arg_type';
import { ElementNotSelected } from './element_not_selected';

function wrapExpression(chain) {
  if (!Array.isArray(chain) || !chain.length) return null;

  return {
    type: 'expression',
    chain,
  };
}

const noSelected = branch(props => !props.argTypeChain, renderComponent(ElementNotSelected));

const Component = ({ argTypeChain }) => {
  function renderArguments(astChain) {
    return astChain.reduce((acc, chain, i) => {
      const prevContext = acc.context;
      const nextArg = astChain[i + 1] || null;

      // wrap each part of the chain in ArgType, passing in the previous context
      const component = (
        <ArgType
          key={i}
          argType={chain.function}
          args={chain.arguments}
          nextArgType={nextArg && nextArg.function}
          expression={wrapExpression(prevContext)}
          expressionIndex={i} />
      );
      acc.components.push(component);
      acc.context = acc.context.concat(chain);

      return acc;
    }, { components: [], context: [] }).components;
  }

  return (
    <div>
      {renderArguments(argTypeChain)}
    </div>
  );
};

Component.propTypes = {
  argTypeChain: PropTypes.array.isRequired,
};

export const ArgTypes = compose(noSelected)(Component);
