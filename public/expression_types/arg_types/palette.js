import React from 'react';
import PropTypes from 'prop-types';
import { ArgType } from '../arg_type';
import { get } from 'lodash';
import { PalettePicker } from '../../components/palette_picker';
import { getType } from '../../../common/types/get_type';

const template = ({ onValueChange, argValue, renderError }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?

  const throwNotParsed = () => renderError();

  // TODO: This is weird, its basically a reimplementation of what the interpretter would return.
  // Probably a better way todo this, and maybe a better way to handle template stype objects in general?
  function astToPalette({ chain }) {
    if (chain.length !== 1 || chain[0].function !== 'palette') throwNotParsed();
    try {
      const colors =  chain[0].arguments._.map(astObj => {
        if (getType(astObj) !== 'string') throwNotParsed();
        return astObj;
      });

      const gradient = get(chain[0].arguments.gradient, '[0]');

      return { colors, gradient };
    } catch (e) {
      throwNotParsed();
    }
  }

  function handleChange(palette) {
    const astObj = {
      type: 'expression',
      chain: [{
        type: 'function',
        function: 'palette',
        arguments: {
          _: palette.colors,
          gradient: [palette.gradient],
        },
      }],
    };

    onValueChange(astObj);
  }

  const palette = astToPalette(argValue);

  return (
    <PalettePicker value={palette} onChange={handleChange}/>
  );
};

template.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  renderError: PropTypes.func,
};

export const palette = () => new ArgType('palette', {
  displayName: 'Palette',
  description: 'Color palette selector',
  defaultValue: 'palette #01A4A4 #CC6666 #D0D102 #616161 #00A1CB #32742C #F18D05 #113F8C #61AE24 #D70060',
  simpleTemplate: template,
});
