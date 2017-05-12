import React from 'react';
import PropTypes from 'prop-types';
import { ArgType } from '../arg_type';

function wrapExpression(chain) {
  if (!Array.isArray(chain) || !chain.length) return null;

  return {
    type: 'expression',
    chain,
  };
}

export function ArgTypes({ argTypeChain }) {
  function renderArguments(astChain) {
    return astChain.reduce((acc, chain, i) => {
      const prevContext = acc.context;
      const nextArg = astChain[i + 1] || null;

      // wrap each part of the chain in ArgType, passing in the previous context
      acc.components.push(<ArgType
        key={i}
        argType={chain.function}
        args={chain.arguments}
        nextArgType={nextArg && nextArg.function}
        expression={wrapExpression(prevContext)}
        expressionIndex={i} />
      );
      acc.context = acc.context.concat(chain);

      return acc;
    }, { components: [], context: [] }).components;
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '5px' }}>
      <div>ArgTypes</div>
      {renderArguments(argTypeChain)}
    </div>
  );
}

ArgTypes.propTypes = {
  argTypeChain: PropTypes.array.isRequired,
};
