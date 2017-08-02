import React from 'react';
import PropTypes from 'prop-types';
import { ArgFormControls } from './arg_form_controls';
import './arg_form.less';

export const ArgForm = ({ valueIndex, argValue, onValueChange, onValueRemove, arg, expand, setExpand, label, ...passedProps }) => {
  return (
    <div className="canvas__arg">
      <div>
        <label className="clickable" onClick={() => setExpand(!expand)}>
          <i className={`fa fa-caret-${expand ? 'down' : 'right'}`}/> {label}
        </label>
        <div style={{ display: expand ? 'block' : 'none' }}>
          <ArgFormControls
            valueIndex={valueIndex} argValue={argValue} onValueChange={onValueChange} arg={arg} {...passedProps}
          />
        </div>
      </div>

      { expand && (
        <div className="canvas__arg--remove" onClick={onValueRemove}>
          <i className="fa fa-trash-o" />
        </div>
      )}
    </div>
  );
};

ArgForm.propTypes = {
  argValue: PropTypes.any,
  arg: PropTypes.object,
  label: PropTypes.string,
  valueIndex: PropTypes.number,
  onValueRemove: PropTypes.func,
  onValueChange: PropTypes.func,
  passedProps: PropTypes.object,
  expand: PropTypes.bool,
  setExpand: PropTypes.func,
};
