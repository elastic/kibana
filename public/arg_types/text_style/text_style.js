import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import ColorPicker from 'plugins/rework/components/color_picker/color_picker';
import {ActiveButton} from 'plugins/rework/components/active_button/active_button';
import $ from 'jquery';

import _ from 'lodash';
import {fonts} from './fonts';
import './text_style.less';

argTypes.push(new ArgType('text_style', {
  default: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    textDecoration: 'none',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontSize: 14,
    textAlign: 'left',
    color: '#000000'
  },
  help: '',
  form: ({commit, value}) => {
    const store = (prop, propValue) => commit({...value, [prop]: propValue});
    const storeText = (prop) => (e) => store(prop, e.target.value);
    const storeNumber = (prop) => (e) => store(prop, Number(e.target.value));
    const storeSimple = (prop) => (value) => store(prop, value);

    const toggleFontStyle = () => store('fontStyle', (value.fontStyle === 'normal' ? 'italic' : 'normal'));
    const toggleFontWeight = () => store('fontWeight', (value.fontWeight === 'normal' ? 'bold' : 'normal'));
    const toggleTextDecoration = () => store('textDecoration', (value.textDecoration === 'none' ? 'underline' : 'none'));

    const setAlign = (alignment) => {
      return () => store('textAlign', alignment);
    };

    return (
      <div className="rework--text-style">
        <div className="rework--text-style--font-and-size rework--inline-form">
          <select className="form-control" onChange={storeText('fontFamily')} value={value.fontFamily}>
            {_.map(fonts(), (font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
          <input className="form-control" type="number" onChange={storeNumber('fontSize')} value={value.fontSize} />
          <ColorPicker color={value.color} popover='right top' onChange={storeSimple('color')}/>
        </div>
        <div className="rework--text-style--style-and-color rework--inline-form">
          <div className="btn-group" role="group">
            <ActiveButton className="btn btn-default fa fa-align-left"
              onClick={setAlign('left')} isActive={value.textAlign === 'left'}></ActiveButton>
            <ActiveButton className="btn btn-default fa fa-align-center"
              onClick={setAlign('center')} isActive={value.textAlign === 'center'}></ActiveButton>
            <ActiveButton className="btn btn-default fa fa-align-right"
              onClick={setAlign('right')} isActive={value.textAlign === 'right'}></ActiveButton>
            <ActiveButton className="btn btn-default fa fa-align-justify"
              onClick={setAlign('justify')} isActive={value.textAlign === 'justify'}></ActiveButton>
          </div>

          <div className="btn-group" role="group" style={{display: 'flex'}}>
            <ActiveButton className="btn btn-default fa fa-bold"
              onClick={toggleFontWeight} isActive={value.fontWeight === 'bold'}></ActiveButton>
            <ActiveButton className="btn btn-default fa fa-italic"
              onClick={toggleFontStyle} isActive={value.fontStyle === 'italic'}></ActiveButton>
            <ActiveButton className="btn btn-default fa fa-underline"
              onClick={toggleTextDecoration} isActive={value.textDecoration === 'underline'}></ActiveButton>
          </div>


        </div>
      </div>
    );
  },
  resolve: (value, state) => {
    value = value || {};
    var cssProperties = {};

    cssProperties['font-weight'] = value.fontWeight;
    cssProperties['font-style'] = value.fontStyle;
    cssProperties['text-decoration'] = value.textDecoration;

    cssProperties['font-family'] = value.fontFamily;
    cssProperties['font-size'] = value.fontSize;
    cssProperties['line-height'] = `${Math.round(5 + value.fontSize)}px`;

    cssProperties['text-align'] = value.textAlign;
    cssProperties.color = value.color;


    const tempElem = $('<div></div>').css(cssProperties);
    const styles = tempElem.attr('style');
    tempElem.remove();
    return {string: styles, object: value};
  }
}));
