import React from 'react';
import PropTypes from 'prop-types';
import { ArgType } from '../arg_type';
import { get } from 'lodash';
import { PalettePicker } from '../../components/palette_picker';

const template = ({ onValueChange, argValue }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?

  const throwNotParsed = () => {throw new Error('Could not parse palette function'); };

  // TODO: This is weird, its basically a reimplementation of what the interpretter would return.
  // Probably a better way todo this, and maybe a better way to handle template stype objects in general?
  function astToPalette({ chain }) {
    if (chain.length !== 1 || chain[0].function !== 'palette') throwNotParsed();
    try {
      const colors =  chain[0].arguments._.map(astObj => {
        if (astObj.type !== 'string') throwNotParsed();
        return astObj.value;
      });

      const gradient = get(chain[0].arguments.gradient, '[0].value');

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
          _: palette.colors.map(color => ({
            type: 'string',
            value: color,
          })),
          gradient: [
            {
              type: 'boolean',
              value: palette.gradient,
            },
          ],
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
  argValue: PropTypes.object.isRequired,
  typeInstance: PropTypes.object,
};

export const palette = () => new ArgType('palette', {
  displayName: 'Palette',
  description: 'Color palette selector',
  defaultValue: 'palette(#01A4A4, #CC6666, #D0D102, #616161, #00A1CB, #32742C, #F18D05, #113F8C, #61AE24, #D70060)',
  simpleTemplate: template,
});
