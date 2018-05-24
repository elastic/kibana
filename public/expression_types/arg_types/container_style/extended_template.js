import React from 'react';
import PropTypes from 'prop-types';
import { EuiSpacer } from '@elastic/eui';
import { BorderForm } from './border_form';
import { AppearanceForm } from './appearance_form';

export const ExtendedTemplate = ({ getArgValue, setArgValue, workpad }) => (
  <div>
    <label>Appearance</label>
    <EuiSpacer size="xs" />
    <AppearanceForm
      padding={getArgValue('padding')}
      backgroundColor={getArgValue('backgroundColor')}
      opacity={getArgValue('opacity')}
      onChange={setArgValue}
    />

    <EuiSpacer size="m" />

    <label>Border</label>
    <EuiSpacer size="xs" />
    <BorderForm
      value={getArgValue('border', '')}
      radius={getArgValue('borderRadius')}
      onChange={setArgValue}
      colors={workpad.colors}
    />
  </div>
);

ExtendedTemplate.displayName = 'ContainerStyleArgExtendedInput';

ExtendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};
