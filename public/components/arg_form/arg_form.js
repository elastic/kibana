import React from 'react';
import PropTypes from 'prop-types';
import './arg_form.less';

export const ArgForm = ({ valueIndex, argValue, onValueChange, onValueRemove, arg, ...passedProps }) => {
  return (
    <div className="canvas__arg">
      <div className="canvas__arg--controls">
        {/* If we make this thing a component we can inject setTitle here */}
        {arg.render({ ...passedProps, valueIndex, argValue, onValueChange })}
      </div>
      <div
        className="canvas__arg--remove"
        onClick={onValueRemove}
      >
        <i className="fa fa-trash-o" />
      </div>
    </div>
  );
};

ArgForm.propTypes = {
  argValue: PropTypes.any,
  arg: PropTypes.object,
  valueIndex: PropTypes.number,
  onValueRemove: PropTypes.func,
  onValueChange: PropTypes.func,
  passedProps: PropTypes.object,
};
