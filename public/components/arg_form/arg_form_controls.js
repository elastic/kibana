import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import './arg_form.less';

export const ArgFormControls = pure(({ valueIndex, argValue, onValueChange, arg, setLabel, ...passedProps }) => {
  return (
    <div className="canvas__arg--controls">
      {/* If we make this thing a component we can inject setTitle here */}
      {arg.render({ ...passedProps, valueIndex, argValue, onValueChange, setLabel })}
    </div>
  );
});

ArgFormControls.propTypes = {
  argValue: PropTypes.any,
  arg: PropTypes.object,
  label: PropTypes.string,
  valueIndex: PropTypes.number,
  onValueChange: PropTypes.func,
  setLabel: PropTypes.func,
};
