import React, { Component, PropTypes } from 'react';
import Tooltip from './tooltip';

function AddDeleteButtons(props) {
  const createDelete = () => {
    if (props.disableDelete) {
      return (<span style={{ display: 'none' }}/>);
    }
    return (
      <Tooltip text="Delete">
        <a className="thor__button-outlined-danger sm" onClick={ props.onDelete }>
          <i className="fa fa-trash-o"></i>
        </a>
      </Tooltip>
    );
  };
  const createAdd = () => {
    if (props.disableAdd) {
      return (<span style={{ display: 'none' }}/>);
    }
    return (
      <Tooltip text="Add">
        <a className="thor__button-outlined-default sm" onClick={ props.onAdd }>
          <i className="fa fa-plus"></i>
        </a>
      </Tooltip>
    );
  };
  const deleteBtn = createDelete();
  const addBtn = createAdd();
  let clone;
  if (props.onClone && !props.disableAdd) {
    clone = (
      <Tooltip text="Clone">
        <a className="thor__button-outlined-default sm" onClick={ props.onClone }>
          <i className="fa fa-files-o"></i>
        </a>
      </Tooltip>
    );
  }
  return (
    <div className="add_delete__buttons">
      { clone }
      { addBtn }
      { deleteBtn }
    </div>
  );
}

AddDeleteButtons.propTypes = {
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  onClone: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func
};

export default AddDeleteButtons;
