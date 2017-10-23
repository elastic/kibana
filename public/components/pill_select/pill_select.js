import React from 'react';
import PropTypes from 'prop-types';
import { difference, without } from 'lodash';
import { FormControl, Popover, Overlay } from 'react-bootstrap';
import './pill_select.less';

export const PillSelect = ({ values, options, onChange, setTarget, setPopover, setSearch, search, target, popover }) => {
  function open(e) {
    setTarget(e.target);
    setPopover(true);
  }

  function close() {
    setPopover(false);
    setSearch('');
  }

  function addPill(val) {
    values.push(val);
    onChange(values);
    setPopover(false);
  }

  function removePill(val) {
    onChange(without(values, val));
  }

  const picker = (
    <Popover id="canvas__pill-select--popover">
      <div className="canvas__pill-select--search">
        <FormControl placeholder="Search..." type="text" onChange={e => setSearch(e.target.value)}/>
      </div>
      <div className="canvas__pill-select--options">
        {difference(options, values).filter(val => val.indexOf(search) > -1).map(opt => (
          <div className="canvas__pill-select--option clickable" key={opt} onClick={() => addPill(opt)}>
            {opt}
          </div>
        ))}
      </div>
    </Popover>
  );

  return (
    <div className="canvas__pill-select">
      { values.map(val => (
        <span className="canvas__pill-select--pill" key={val}>
          {val} <i className="fa fa-times clickable" onClick={() => removePill(val)}/>
        </span>
      ))}
      <i className="fa fa-plus clickable" onClick={open}/>
      <Overlay
        rootClose
        onHide={close}
        show={popover}
        container={this}
        target={target}
      >
        {picker}
      </Overlay>
    </div>
  );
};

PillSelect.propTypes = {
  values: PropTypes.array,
  options: PropTypes.array,
  onChange: PropTypes.func,
  allowDupe: PropTypes.bool,
  setTarget: PropTypes.func,
  setPopover: PropTypes.func,
  target: PropTypes.object,
  popover: PropTypes.bool,
  setSearch: PropTypes.func,
  search: PropTypes.string,
};
