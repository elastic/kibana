import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { set } from 'object-path-immutable';
import { ArgType } from '../../arg_type';
import { getStringType } from '../../../../common/types/get_type';
import { BorderForm } from './border_form';
import { AppearanceForm } from './appearance_form';

import './container_style.less';

const template = ({ onValueChange, argValue }) => {
  const args = get(argValue, 'chain.0.arguments', {});

  const getArgValue = (args, name, alt) => get(args, [name, 0, 'value'], alt);

  const setArgValue = (args, name, val) => {
    const value = {
      value: val,
      type: getStringType(val),
    };
    const newValue = set(argValue, ['chain', 0, 'arguments', name, 0], value);
    onValueChange(newValue);
  };

  return (
    <div className="canvas__argtype--containerStyle">
      <div>
        <label>Appearance</label>
        <AppearanceForm
          className="canvas__argtype--containerStyle--appearance"
          padding={getArgValue(args, 'padding')}
          backgroundColor={getArgValue(args, 'backgroundColor')}
          opacity={getArgValue(args, 'opacity')}
          onChange={(...blah) => setArgValue(args, ...blah)}
        />

        <label>Border</label>
        <BorderForm
          className="canvas__argtype--containerStyle--border"
          value={getArgValue(args, 'border', '')}
          radius={getArgValue(args, 'borderRadius')}
          onChange={(...blah) => setArgValue(args, ...blah)} />
      </div>
    </div>
  );
};

template.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
};

export const containerStyle = () => new ArgType('containerStyle', {
  displayName: 'Image Upload',
  description: 'Select or upload an image',
  template: template,
});
