import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiTableRowCell } from './table_row_cell';

export const KuiTableRowCheckBoxCell = ({ onChange, isChecked, className, ...rest }) => {
  const classes = classNames('kuiTableRowCell--checkBox', className);
  return (
    <KuiTableRowCell
      className={classes}
      {...rest}
    >
      <input
        type="checkbox"
        className="kuiCheckBox"
        onChange={onChange}
        checked={isChecked}
        aria-label={`${isChecked ? 'Deselect' : 'Select'} row`}
      />
    </KuiTableRowCell>
  );
};
KuiTableRowCheckBoxCell.propTypes = {
  isChecked: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
};
