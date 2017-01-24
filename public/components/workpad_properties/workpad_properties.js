import React from 'react';
import { CirclePicker } from 'react-color';
import _ from 'lodash';

export default React.createClass({
  updateNumber(prop) {
    return (e) => {
      const {workpad, onChange} = this.props;
      onChange({...workpad, [prop]: Number(e.target.value)});
    };
  },
  render() {
    const {workpad} = this.props;

    return (
      <div className='rework--workpad-properties'>
        <h4>Workpad Size</h4>

        <form>
          <div className="form-group">
            <label>Height</label>
            <input type="number" className="form-control" value={workpad.height} onChange={this.updateNumber('height')}/>
          </div>
          <div className="form-group">
            <label>Width</label>
            <input type="number" className="form-control" value={workpad.width} onChange={this.updateNumber('width')}/>
          </div>
        </form>
      </div>
    );
  }
});
