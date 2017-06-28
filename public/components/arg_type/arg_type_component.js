import React from 'react';
import PropTypes from 'prop-types';

// compose the above branch components, to short-circuit rending this ArgType component
export const ArgTypeComponent = ({ args, expressionType, onValueChange, context, nextExpressionType }) => {
  return (
    <div className="canvas__argtype">
      { expressionType.render({ args, context, nextExpressionType, onValueChange }) }
    </div>
  );
};

ArgTypeComponent.propTypes = {
  args: PropTypes.object.isRequired,
  expressionType: PropTypes.object.isRequired,
  onValueChange: PropTypes.func.isRequired,
  nextExpressionType: PropTypes.object,
  context: PropTypes.object,
};
