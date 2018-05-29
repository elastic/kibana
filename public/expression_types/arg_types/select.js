import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';
import { templateFromReactComponent } from '../../lib/template_from_react_component';

const SelectArgInput = ({ typeInstance, onValueChange, argValue, argId }) => {
  const choices = typeInstance.options.choices.map(({ value, name }) => ({ value, text: name }));
  const handleChange = ev => onValueChange(ev.target.value);

  return <EuiSelect id={argId} defaultValue={argValue} options={choices} onChange={handleChange} />;
};

SelectArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  typeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    options: PropTypes.shape({
      choices: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        })
      ).isRequired,
    }),
  }),
  argId: PropTypes.string.isRequired,
};

export const select = () => ({
  name: 'select',
  displayName: 'Select',
  help: 'Select from multiple options in a drop down',
  simpleTemplate: templateFromReactComponent(SelectArgInput),
});
