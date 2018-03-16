import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiColorPickerEmptySwatch } from './color_picker_empty_swatch';

export function KuiColorPickerSwatch(props) {
  const { color, className } = props;
  const isClear = !color;
  const classes = classNames('kuiColorPicker__swatch', className, {
    'kuiColorPicker__emptySwatch': isClear,
  });
  let children;

  if (isClear) {
    children = <KuiColorPickerEmptySwatch />;
  }

  return (
    <div
      className={classes}
      aria-label={props['aria-label']}
      data-test-subj="colorSwatch"
      style={{ background: color ? color : '' }}
    >
      {children}
    </div>
  );
}

KuiColorPickerSwatch.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
};

