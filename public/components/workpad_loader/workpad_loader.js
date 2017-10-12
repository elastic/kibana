import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormControl, Button, Table } from 'react-bootstrap';
import moment from 'moment';
import { ConfirmModal } from '../confirm_modal';
import './workpad_loader.less';

export const WorkpadLoader = (props) => {
  const {
    workpadId,
    workpads,
    searchText,
    setSearchText,
    createPending,
    setCreatePending,
    createWorkpad,
    findWorkpads,
    loadWorkpad,
    removeWorkpad,
    deleteWorkpad,
    setDeleteWorkpad,
    onClose,
  } = props;

  const isLoading = !Boolean(workpads);
  const isDeleteOpen = Boolean(deleteWorkpad.id && deleteWorkpad.name);

  const load = (id) => {
    if (id !== workpadId) {
      loadWorkpad(id);
      onClose();
    }
  };

  const formatDate = (date) => {
    return moment(date).format('MMM D, YYYY @ h:mma');
  };

  const create = () => {
    createWorkpad();
    setCreatePending(true);
  };

  const removeConfirm = ({ name, id }) => {
    setDeleteWorkpad({ name, id });
  };

  const closeRemoveConfirm = () => {
    setDeleteWorkpad({});
  };

  const remove = (id) => {
    removeWorkpad(id);
    closeRemoveConfirm();
  };

  const search = (str) => {
    setSearchText(str);
    findWorkpads(str);
  };

  return (
    <div className="canvas__workpad_loader">

      <Form className="canvas__workpad_loader--controls">
        <Button
          bsSize="xsmall"
          bsStyle="primary"
          onClick={create}
          disabled={createPending}
          className="canvas__workpad_loader--new"
        >
          {createPending && <i className="fa fa-spinner fa-pulse" />}
          {!createPending && <i className="fa fa-plus" />}
          &nbsp;New Workpad
        </Button>
        <FormControl
          type="text"
          placeholder="Find Workpads"
          value={searchText}
          onChange={ev => search(ev.target.value)}
        />
      </Form>

      <Table condensed className="canvas__workpad_loader--workpads">
        <thead>
          <tr>
            <th>Workpad name</th>
            <th>Updated</th>
            <th>Created</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {!isLoading && workpads.length === 0 && (
            <tr>
              <td colSpan="3">No matching workpads found</td>
            </tr>
          )}
          {!isLoading && workpads.workpads.map(wp => (
            <tr
              key={wp.id}
              className="canvas__workpad_loader--workpad"
              onClick={() => load(wp.id)}
            >
              <td width="97%" className="canvas__workpad_loader--name">{wp.name}</td>
              <td width="1%" className="canvas__workpad_loader--created">{formatDate(wp['@created'])}</td>
              <td width="1%" className="canvas__workpad_loader--updated">{formatDate(wp['@timestamp'])}</td>
              <td width="1%" className="canvas__workpad_loader--delete">
                <span onClick={() => removeConfirm(wp)} className="fa fa-trash" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <ConfirmModal
        isOpen={isDeleteOpen}
        message={`Are you sure you want to remove the workpad '${deleteWorkpad.name}'?`}
        confirmButtonText="Remove"
        onConfirm={() => remove(deleteWorkpad.id)}
        onCancel={closeRemoveConfirm}
      />

    </div>
  );
};

WorkpadLoader.propTypes = {
  workpadId: PropTypes.string,
  workpads: PropTypes.object,
  searchText: PropTypes.string.isRequired,
  setSearchText: PropTypes.func.isRequired,
  createPending: PropTypes.bool.isRequired,
  setCreatePending: PropTypes.func.isRequired,
  createWorkpad: PropTypes.func.isRequired,
  loadWorkpad: PropTypes.func.isRequired,
  findWorkpads: PropTypes.func.isRequired,
  removeWorkpad: PropTypes.func.isRequired,
  setDeleteWorkpad: PropTypes.func.isRequired,
  deleteWorkpad: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
