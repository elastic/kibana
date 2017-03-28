import React, { PropTypes } from 'react';
import Tooltip from './tooltip';

function AddDeleteButtons(props) {
  const createDelete = () => {
    if (props.disableDelete) {
      return null;
    }
    return (
      <Tooltip text={props.deleteTooltip}>
        <a className="thor__button-outlined-danger sm" onClick={ props.onDelete }>
          <i className="fa fa-trash-o"></i>
        </a>
      </Tooltip>
    );
  };
  const createAdd = () => {
    if (props.disableAdd) {
      return null;
    }
    return (
      <Tooltip text={props.addTooltip}>
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
      <Tooltip text={props.cloneTooltip}>
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

AddDeleteButtons.defaultProps = {
  addTooltip: 'Add',
  deleteTooltip: 'Delete',
  cloneTooltip: 'Clone'
};

AddDeleteButtons.propTypes = {
  addTooltip: PropTypes.string,
  deleteTooltip: PropTypes.string,
  cloneTooltip: PropTypes.string,
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  onClone: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func
};

export default AddDeleteButtons;
