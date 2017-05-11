import React from 'react';
import PropTypes from 'prop-types';
import { Panel } from 'react-bootstrap';

function renderUnknown(name) {
  return (
    <Panel header={ name } bsStyle="warning">
      <div>unknown expression type: { name }</div>
    </Panel>
  );
}

function renderExpression(name, expressionType, props) {
  return (
    <Panel header={ name }>
      { expressionType.render(props) }
    </Panel>
  );
}

export function ArgType(props) {
  const {
    args,
    name,
    expressionType,
    nextExpressionType,
    context,
    requiresContext,
    onValueChange,
  } = props;
  const contextPending = Boolean(requiresContext && (!context || context.state === 'pending'));
  const contextError = Boolean(requiresContext && context && context.state === 'error');

  if (contextPending) {
    return (
      <Panel header={ name }>
        <div>Loading...</div>
      </Panel>
    );
  }

  if (contextError) {
    return (
      <Panel header={ name } bsStyle="danger">
        <div>Failed to load: {context.error}</div>
      </Panel>
    );
  }

  return !expressionType
    ? renderUnknown(name)
    : renderExpression(name, expressionType, { args, context, nextExpressionType, onValueChange });
}

ArgType.propTypes = {
  args: PropTypes.object,
  name: PropTypes.string.isRequired,
  requiresContext: PropTypes.bool.isRequired,
  expressionType: PropTypes.object.isRequired,
  nextExpressionType: PropTypes.object,
  context: PropTypes.object,
  onValueChange: PropTypes.func,
};
