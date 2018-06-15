import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import { EuiIcon, EuiLink, EuiButtonIcon } from '@elastic/eui';
import { ColorPickerMini } from '../../../components/color_picker_mini';
import { TooltipIcon } from '../../../components/tooltip_icon';

export const SimpleTemplate = props => {
  const { argValue, onValueChange, labels, workpad } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const color = get(chainArgs, 'color.0', '');

  const handleChange = (argName, ev) => {
    const fn = ev.target.value === '' ? del : set;

    const newValue = fn(argValue, ['chain', 0, 'arguments', argName], [ev.target.value]);
    return onValueChange(newValue);
  };

  const handlePlain = (argName, val) => handleChange(argName, { target: { value: val } });

  return (
    <div>
      <label>Color&nbsp;</label>
      {!color || color.length === 0 ? (
        <span>
          <EuiLink onClick={() => handlePlain('color', '#000000')}>
            Auto <EuiIcon type="bolt" />
          </EuiLink>
        </span>
      ) : (
        <span className="canvas__argtype--seriesStyle--color-picker">
          <ColorPickerMini
            value={color}
            onChange={val => handlePlain('color', val)}
            colors={workpad.colors}
          />
          <span>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              onClick={() => handlePlain('color', '')}
              aria-label="Remove Series Color"
            />
          </span>
        </span>
      )}
      &nbsp;
      {(!labels || labels.length === 0) && (
        <TooltipIcon
          placement="left"
          icon="warning"
          text="Data has no series to style, add a color dimension"
        />
      )}
    </div>
  );
};

SimpleTemplate.displayName = 'SeriesStyleArgSimpleInput';

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  labels: PropTypes.array,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};
