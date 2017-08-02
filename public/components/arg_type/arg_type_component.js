import React from 'react';
import PropTypes from 'prop-types';

import './arg_type.less';

// compose the above branch components, to short-circuit rending this ArgType component
export const ArgTypeComponent = (props) => {
  const { expressionType, ...passedProps } = props;
  return (
    <div className="canvas__function">
      { expressionType.render(passedProps) }
    </div>
  );
};

ArgTypeComponent.propTypes = {
  args: PropTypes.object.isRequired,
  expressionType: PropTypes.object.isRequired,
  onValueChange: PropTypes.func.isRequired,
  onValueRemove: PropTypes.func.isRequired,
  nextExpressionType: PropTypes.object,
  context: PropTypes.object,
};
