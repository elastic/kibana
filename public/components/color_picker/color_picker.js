import React from 'react';
import { CirclePicker } from 'react-color';
import { Popover, PopoverContent, PopoverTitle } from 'reactstrap';
import chroma from 'chroma-js';
import uuid from 'uuid/v4';
import './color_picker.less';

export default class ArgumentForm extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
    this.state = {popover: false};
  }

  togglePopover() {
    this.setState({
      popover: !this.state.popover
    });
  }

  dismissPopover() {
    this.setState({
      popover: false
    });
  }

  onChange(colorObj) {
    const {r,g,b,a} = colorObj.rgb;
    this.props.onChange(`rgba(${r},${g},${b},${a})`);
  }

  render() {
    const {color, onChange, popover} = this.props;

    const setTransparent = () => this.onChange({rgb: {r:255,g:255,b:255,a:0}});

    const colors = this.props.colors || [
      '#37988d', '#c19628', '#b83c6f', '#3f9939', '#1785b0', '#ca5f35',
      '#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643',
      '#72cec3', '#f5cc5d', '#ec77a8', '#7acf74', '#4cbce4', '#fd986f',
      '#a1ded7', '#f8dd91', '#f2a4c5', '#a6dfa2', '#86d2ed', '#fdba9f',
      '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    ];

    const isTransparent = color === 'rgba(255,255,255,0)';
    const picker = (
      <div className="rework--color-picker">
        <center>
          <CirclePicker width='190px' color={color} colors={colors} circleSize={24} circleSpacing={6} onChange={this.onChange.bind(this)}/>
          <button onClick={setTransparent.bind(this)} className="rework--color-picker--transparent btn btn-default btn-xs">
            Transparent
            { !isTransparent ? null : (
              <i className="fa fa-check"></i>
            )}
          </button>
        </center>
      </div>
    );

    const popoverId = uuid();

    let pencilColor;
    try {
      pencilColor = chroma.contrast(color, '#000') < 4.5 ? '#fff' : '#000';
    } catch (e) {
      pencilColor = '#000';
    }
    return !popover ? picker : (
      <div>
        <button
          className="btn rework--color-picker--popover-button"
          style={{backgroundColor: color, color: pencilColor}}
          onClick={this.togglePopover.bind(this)}
          id={`colorPicker-${popoverId}`}>
          <i className="fa fa-pencil"></i>
        </button>
        <Popover
          placement={popover}
          isOpen={this.state.popover}
          target={`colorPicker-${popoverId}`}
          toggle={this.dismissPopover.bind(this)}>
          <PopoverContent>
            {picker}
          </PopoverContent>
        </Popover>
      </div>
    );
  }
};
