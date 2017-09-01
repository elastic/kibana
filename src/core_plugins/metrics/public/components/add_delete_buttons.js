import PropTypes from 'prop-types';
import React from 'react';
import Tooltip from './tooltip';

function AddDeleteButtons(props) {
  const createDelete = () => {
    if (props.disableDelete) {
      return null;
    }
    return (
      <Tooltip text={props.deleteTooltip}>
        <button
          aria-label={props.deleteTooltip}
          className="thor__button-outlined-danger sm"
          onClick={props.onDelete}
        >
          <i className="fa fa-trash-o" />
        </button>
      </Tooltip>
    );
  };
  const createAdd = () => {
    if (props.disableAdd) {
      return null;
    }
    return (
      <Tooltip text={props.addTooltip}>
        <button
          aria-label={props.addTooltip}
          className="thor__button-outlined-default sm"
          onClick={props.onAdd}
        >
          <i className="fa fa-plus" />
        </button>
      </Tooltip>
    );
  };
  const deleteBtn = createDelete();
  const addBtn = createAdd();
  let clone;
  if (props.onClone && !props.disableAdd) {
    clone = (
      <Tooltip text={props.cloneTooltip}>
        <button
          aria-label={props.cloneTooltip}
          className="thor__button-outlined-default sm"
          onClick={props.onClone}
        >
          <i className="fa fa-files-o" />
        </button>
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
