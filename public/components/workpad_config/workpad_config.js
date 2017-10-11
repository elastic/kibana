import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormGroup, FormControl, Label } from 'react-bootstrap';

import './workpad_config.less';

export const WorkpadConfig = ({ size, name, setSize, setName }) => {
  const rotate = () => setSize({ width: size.height, height: size.width });

  return (
    <div className="canvas__workpad_config">
      <FormGroup>
        <FormControl
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Workpad Name"
        />
      </FormGroup>
      <div className="canvas__workpad-config--size">
        <div>
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
        </div>
        <div>
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
        </div>
        <div>
          <i onClick={rotate} className="fa fa-rotate-right"/>
        </div>
      </div>
      <div className="canvas__workpad_config--presets">
        <Label bsStyle="default" onClick={() => setSize({ height: 1080, width: 1920 })}>1080p</Label>
        <Label bsStyle="default" onClick={() => setSize({ height: 720, width: 1280 })}>720p</Label>
        <Label bsStyle="default" onClick={() => setSize({ height: 842, width: 590 })}>A4</Label>
        <Label bsStyle="default" onClick={() => setSize({ height: 792, width: 612 })}>US Letter</Label>
      </div>
    </div>
  );
};

WorkpadConfig.propTypes = {
  size: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  setSize: PropTypes.func.isRequired,
  setName: PropTypes.func.isRequired,
};
