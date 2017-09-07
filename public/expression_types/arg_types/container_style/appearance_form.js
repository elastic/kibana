import React from 'react';
import PropTypes from 'prop-types';
import { LabeledInput } from '../../../components/labeled_input';

const paddings = [['0px', 'None'], '1px', '2px', '3px', '4px', '5px', '6px', '7px', '8px', '9px', '10px'];
const opacities = [[1, '100%'], [0.9, '90%'], [0.7, '70%'], [0.5, '50%'], [0.3, '30%'], [0.1, '10%']];

export const AppearanceForm = ({ className, padding, opacity, onChange }) => {
  const namedChange = name => (ev) => {
    if (name === 'padding') return onChange(name, `${ev.target.value}px`);

    onChange(name, ev.target.value);
  };

  return (
    <div className={className}>
      <LabeledInput
        type="number"
        className="padding"
        label="Padding"
        value={padding.replace('px', '')}
        values={paddings}
        onChange={namedChange('padding')}
      />

      <LabeledInput
        type="select"
        className="opacity"
        label="Opacity"
        value={opacity}
        values={opacities}
        onChange={namedChange('opacity')}
      />
    </div>
  );
};

AppearanceForm.propTypes = {
  padding: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  opacity: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};
