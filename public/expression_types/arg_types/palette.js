import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { ArgType } from '../arg_type';
import { map } from 'lodash';
import { palettes } from '../../../common/lib/palettes';

const template = ({ onValueChange, argValue }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?

  const throwNotParsed = () => {throw new Error('Could not parse palette function'); };

  function astToColors({ chain }) {
    if (chain.length !== 1 || chain[0].function !== 'palette') throwNotParsed();
    try {
      return chain[0].arguments._.map(astObj => {
        if (astObj.type !== 'string') throwNotParsed();
        return astObj.value;
      });
    } catch (e) {
      throwNotParsed();
    }
  }

  function handleChange(ev) {
    const colors = JSON.parse(ev.target.value);
    const astObj = {
      type: 'expression',
      chain: [{
        type: 'function',
        function: 'palette',
        arguments: {
          _: colors.map(color => ({
            type: 'string',
            value: color,
          })),
        },
      }],
    };

    onValueChange(astObj);
  }

  const options = map(palettes, (choice, name) => (
    <option value={JSON.stringify(choice.colors)} key={name}>{name}</option>
  ));

  return (
    <FormControl componentClass="select" value={JSON.stringify(astToColors(argValue))} onChange={handleChange}>
      {options}
    </FormControl>
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
