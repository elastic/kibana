import React from 'react';
import PropTypes from 'prop-types';
import './function_form.less';

// compose the above branch components, to short-circuit rending this ArgType component
export const FunctionFormComponent = ({ expressionType, ...passedProps }) => (
  <div className="canvas__function">
    { expressionType.render(passedProps) }
  </div>
);

FunctionFormComponent.propTypes = {
  args: PropTypes.object.isRequired,
  expressionType: PropTypes.object.isRequired,
  onValueChange: PropTypes.func.isRequired,
  onValueRemove: PropTypes.func.isRequired,
  nextExpressionType: PropTypes.object,
  context: PropTypes.object,
};
