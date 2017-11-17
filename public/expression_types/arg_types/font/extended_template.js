import React from 'react';
import PropTypes from 'prop-types';
import { TextStylePicker } from '../../../components/text_style_picker';
import { get, mapValues, set } from 'lodash';

export const extendedTemplate = (props) => {
  const { onValueChange, argValue } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});

  // TODO: Validate input

  const spec = mapValues(chainArgs, '[0]');

  function handleChange(newSpec) {
    const newValue = set(argValue, ['chain', 0, 'arguments'], mapValues(newSpec, v => [v]));
    return onValueChange(newValue);
  }

  return (
    <div>
      <TextStylePicker
        family={spec.family}
        color={spec.color}
        size={spec.size}
        align={spec.align}
        weight={spec.weight}
        underline={spec.underline || false}
        italic={spec.italic || false}
        onChange={handleChange}
      />
    </div>

  );
};

extendedTemplate.displayName = 'FontArgExtendedInput';

extendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  typeInstance: PropTypes.object,
  labels: PropTypes.array.isRequired,
  renderError: PropTypes.func,
};
