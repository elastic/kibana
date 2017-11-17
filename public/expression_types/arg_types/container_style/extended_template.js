import React from 'react';
import PropTypes from 'prop-types';
import { BorderForm } from './border_form';
import { AppearanceForm } from './appearance_form';

import './container_style.less';

export const extendedTemplate = ({ getArgValue, setArgValue }) => (
  <div className="canvas__argtype--containerStyle">
    <div>
      <label>Appearance</label>
      <AppearanceForm
        className="canvas__argtype--containerStyle--appearance"
        padding={getArgValue('padding')}
        backgroundColor={getArgValue('backgroundColor')}
        opacity={getArgValue('opacity')}
        onChange={setArgValue}
      />

      <label>Border</label>
      <BorderForm
        className="canvas__argtype--containerStyle--border"
        value={getArgValue('border', '')}
        radius={getArgValue('borderRadius')}
        onChange={setArgValue} />
    </div>
  </div>
);

extendedTemplate.displayName = 'ContainerStyleArgExtendedInput';

extendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
};
