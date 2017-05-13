import React from 'react';
import PropTypes from 'prop-types';
import { Panel } from 'react-bootstrap';

export function ArgType(props) {
  const { name, expressionType } = props;
  const expressionProps = {
    args: props.args,
    context: props.context,
    nextExpressionType: props.nextExpressionType,
    onValueChange: props.onValueChange,
  };

  return (
    <Panel header={ name }>
      { expressionType.render(expressionProps) }
    </Panel>
  );
}

ArgType.propTypes = {
  name: PropTypes.string.isRequired,
  expressionType: PropTypes.object.isRequired,
  args: PropTypes.object.isRequired,
  context: PropTypes.object,
  nextExpressionType: PropTypes.object,
  onValueChange: PropTypes.func,
};
