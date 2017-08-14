import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, ControlLabel, FormControl, Button, Table } from 'react-bootstrap';
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

  const search = (ev) => {
    ev.preventDefault();
    findWorkpads();
  };

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

  return (
    <div className="canvas__workpad_loader">

      <div className="canvas__workpad_loader--search">

        <Form inline onSubmit={search}>
          <FormGroup controlId="workpadSearchInline">
            <ControlLabel>Search</ControlLabel>
            <FormControl
              type="text"
              placeholder="Workpad Name"
              value={searchText}
              onChange={ev => setSearchText(ev.target.value)}
            />
          </FormGroup>
            <Button bsSize="small" type="submit" disabled={isLoading}>
              {isLoading && <i className="fa fa-spinner fa-pulse" />}
              {!isLoading && <i className="fa fa-search" />}
              &nbsp;Find
            </Button>
        </Form>

        <div className="canvas__workpad_loader--controls">
          <Button bsSize="small" onClick={create} disabled={createPending}>
            {createPending && <i className="fa fa-spinner fa-pulse" />}
            {!createPending && <i className="fa fa-plus" />}
            &nbsp;New Workpad
          </Button>
        </div>

        <Table striped condensed>
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
                className={wp.id === workpadId ? 'workpad active' : 'workpad'}
              >
                <td className="name" onClick={() => load(wp.id)}>{wp.name}</td>
                <td>{formatDate(wp['@timestamp'])}</td>
                <td>{formatDate(wp['@created'])}</td>
                <td><span onClick={() => removeConfirm(wp)} className="fa fa-trash" /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

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
