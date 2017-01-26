import React from 'react';
import _ from 'lodash';
import ColorPicker from 'plugins/rework/components/color_picker/color_picker';

export default React.createClass({
  setColor(color) {
    const {page, onChange} = this.props;
    onChange({...page, style: {...page.style, backgroundColor: color.hex}});
  },
  render() {
    const {page, onChange} = this.props;

    return (
      <div className='rework--page-properties'>
        <h4>Page Background</h4>
        <ColorPicker color={page.style.backgroundColor} onChange={this.setColor}/>
      </div>
    );
  }
});
