import React from 'react';
import PropTypes from 'prop-types';
import { Label } from 'react-bootstrap';

export function ArgType(props) {
  const { name, expressionType } = props;
  const expressionProps = {
    args: props.args,
    context: props.context,
    nextExpressionType: props.nextExpressionType,
    onValueChange: props.onValueChange,
  };

  return (
    <div>
      {/*
        TODO: I'm leaving the { name } thing here for you Joe, while you debug. Get rid of it before we ship.
      */}
      <Label className="pull-right">{ name }</Label><br/>
      { expressionType.render(expressionProps) }
    </div>
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
