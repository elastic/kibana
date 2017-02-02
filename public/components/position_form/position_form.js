import React from 'react';

export const PositionForm = React.createClass({
  set(prop) {
    return (e) => {
      const {position, onChange} = this.props;
      onChange({...position, [prop]: Number(e.target.value)});
    };
  },
  render() {
    const {position} = this.props;

    return (
      <table className="rework--table-form">
        <tbody>
          <tr>
            <td width="150">
              <input type="number" className="form-control"
              onChange={this.set('left')}
              value={position.left}/>
              <label>X</label>
            </td>
            <td width="150">
              <input type="number" className="form-control"
              onChange={this.set('top')}
              value={position.top}/>
              <label>Y</label>
            </td>
          </tr>
          <tr>
            <td width="150">
              <input type="number" className="form-control"
              onChange={this.set('height')}
              value={position.height}/>
              <label>Height</label>
            </td>
            <td width="150">
              <input type="number" className="form-control"
              onChange={this.set('width')}
              value={position.width}/>
              <label>Width</label>
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <input type="range" min="0" max="360"
              onChange={this.set('angle')}
              value={position.angle}/>
              <label>Angle <small>({position.angle}deg)</small></label>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
});
