import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import ColorPicker from 'plugins/rework/components/color_picker/color_picker';

argTypes.push(new ArgType('container_style', {
  default: {
    borderWidth: 0,
    borderColor: 'rgba(0,0,0,0)',
    padding: 0,
    opacity: 10,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  // help: 'Style divs and other containers',
  form: ({commit, value, options}) => {

    // Show everything, unless we're specifically telling the argument what to show
    const show = options.show ? {
      borderWidth: false,
      borderColor: false,
      padding: false,
      opacity: false,
      backgroundColor: false,
      ...options.show
    } : {
      borderWidth: true,
      borderColor: true,
      padding: true,
      opacity: true,
      backgroundColor: true,
    };

    const store = (prop, propValue) => {
      commit({...value, [prop]: propValue});
    };

    const storeText = (prop) => {
      return (e) => store(prop, e.target.value);
    };

    const storeNumber = (prop) => {
      return (e) => store(prop, Number(e.target.value));
    };

    const storeSimple = (prop) => {
      return (value) => store(prop, value);
    };

    const borderWidthCell = (
      <td width="150">
        <input type="number" className="form-control"
        onChange={storeNumber('borderWidth')}
        value={value.borderWidth}/>
        <label>Border Width</label>
      </td>
    );

    const borderColorCell = (
      <td>
        <ColorPicker color={value.borderColor} popover='right top' onChange={storeSimple('borderColor')}/>
        <label>Border Color</label>
      </td>
    );

    const backgroundColorCell = (
      <td>
        <ColorPicker color={value.backgroundColor} popover='right top' onChange={storeSimple('backgroundColor')}/>
        <label>Background Color</label>
      </td>
    );

    const paddingCell = (
      <td>
        <input type="number" className="form-control"
        onChange={storeNumber('padding')}
        value={value.padding}/>
        <label>Padding</label>
      </td>
    );

    const opacityCell = (
      <td colSpan="2">
        <input type="range" min="0" max="10"
        onChange={storeNumber('opacity')}
        value={value.opacity}/>
        <label>Opacity</label>
      </td>
    );

    return (
      <table className="rework--table-form">
        <tbody>
          <tr>
            {!show.borderWidth ? null : borderWidthCell}
            {!show.borderColor ? null : borderColorCell}
            {!show.backgroundColor ? null : backgroundColorCell}
          </tr>
          <tr>
            {!show.padding ? null : paddingCell}
            {!show.opacity ? null : opacityCell}
          </tr>
        </tbody>
      </table>
    );
  },
  resolve: (value, state) => {
    // Since our components will really just be setting properties
    // on an object there's nothing we need to do here.
    return {
      border: `${value.borderWidth}px solid ${value.borderColor}`,
      padding: value.padding + 'px',
      opacity: value.opacity / 10,
      backgroundColor: value.backgroundColor
    };
  }
}));
