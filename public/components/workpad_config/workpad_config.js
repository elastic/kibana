import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl, Label } from 'react-bootstrap';

import './workpad_config.less';

export const WorkpadConfig = ({ setSize, size }) => {
  const rotate = () => setSize({ width: size.height, height: size.width });

  return (
    <div className="canvas__workpad_config">
      <h4>Workpad <i className="fa fa-rotate-right" style={{ cursor: 'pointer' }} onClick={rotate}  /></h4>
        <FormControl
          spellCheck={false}
          componentClass="input"
          type="number"
          onChange={e => setSize({ width: Number(e.target.value), height: size.height })}
          value={size.width}
        />
        <ControlLabel>
          Width
        </ControlLabel>

        <FormControl
          spellCheck={false}
          componentClass="input"
          type="number"
          onChange={e => setSize({ height: Number(e.target.value), width: size.width })}
          value={size.height}
        />
        <ControlLabel>
          Height
        </ControlLabel>

        <div className="canvas__workpad_config--presets">
          Presets
          <Label bsStyle="default" onClick={() => setSize({ height: 1080, width: 1920 })}>1080p</Label>
          <Label bsStyle="default" onClick={() => setSize({ height: 720, width: 1280 })}>720p</Label>
          <Label bsStyle="default" onClick={() => setSize({ height: 842, width: 590 })}>A4</Label>
          <Label bsStyle="default" onClick={() => setSize({ height: 792, width: 612 })}>US Letter</Label>
        </div>
    </div>
  );
};

WorkpadConfig.propTypes = {
  size: PropTypes.object,
  setSize: PropTypes.func,
};
