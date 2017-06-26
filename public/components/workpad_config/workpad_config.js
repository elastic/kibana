import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl } from 'react-bootstrap';


export const WorkpadConfig = ({ setSize, size }) => {

  return (
    <div className="canvas__workpad_config">
      <h5>Workpad Settings</h5>
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

    </div>
  );
};

WorkpadConfig.propTypes = {
  size: PropTypes.object,
  setSize: PropTypes.func,
};
