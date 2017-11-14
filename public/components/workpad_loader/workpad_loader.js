import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormControl, Button, Table } from 'react-bootstrap';
import moment from 'moment';
import Dropzone from 'react-dropzone';
import { ConfirmModal } from '../confirm_modal';
import './workpad_loader.less';
import { getId } from '../../lib/get_id';
import { create as saveToES } from '../../lib/workpad_service';

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
    loadWorkpadById,
    removeWorkpad,
    downloadWorkpadById,
    deleteWorkpad,
    setDeleteWorkpad,
    dropping,
    setDropping,
    onClose,
  } = props;

  const isLoading = !Boolean(workpads);
  const isDeleteOpen = Boolean(deleteWorkpad.id && deleteWorkpad.name);

  const onDrop = (files) => {
    const reader = new FileReader();
    reader.onload = () => {
      const workpad = JSON.parse(reader.result);
      workpad.id = getId('workpad');
      // TODO: Clean up this file, this loading stuff can, and should be, abstracted
      loadWorkpad(workpad);
      saveToES(workpad);
      onClose();
    };
    reader.readAsText(files[0]);
    setDropping(false);
  };

  const load = (id) => {
    if (id !== workpadId) {
      loadWorkpadById(id);
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
      <Dropzone
        accept="application/json"
        onDrop={onDrop}
        onDragEnter={() => setDropping(true)}
        onDragLeave={() => setDropping(false)}
        disableClick
        style={{ border: dropping ? '2px dashed' : '2px solid transparent' }}>
        <center>
          <p>
            <i>Tip: Drag and drop a <code>JSON</code> exported workpad into this dialog to load new workpad from a file</i>
          </p>
        </center>

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
              >
                <td width="97%" className="canvas__workpad_loader--name" onClick={() => load(wp.id)}>{wp.name}</td>
                <td width="1%" className="canvas__workpad_loader--created" onClick={() => load(wp.id)}>{formatDate(wp['@created'])}</td>
                <td width="1%" className="canvas__workpad_loader--updated" onClick={() => load(wp.id)}>{formatDate(wp['@timestamp'])}</td>
                <td width="1%" className="canvas__workpad_loader--export">
                  <span onClick={() => downloadWorkpadById(wp.id)} className="fa fa-download" />
                </td>
                <td width="1%" className="canvas__workpad_loader--delete">
                  <span onClick={() => removeConfirm(wp)} className="fa fa-trash" />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Dropzone>

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
  dropping: PropTypes.bool.isRequired,
  setDropping: PropTypes.func.isRequired,
  searchText: PropTypes.string.isRequired,
  setSearchText: PropTypes.func.isRequired,
  createPending: PropTypes.bool.isRequired,
  setCreatePending: PropTypes.func.isRequired,
  createWorkpad: PropTypes.func.isRequired,
  downloadWorkpadById: PropTypes.func.isRequired,
  loadWorkpad: PropTypes.func.isRequired,
  loadWorkpadById: PropTypes.func.isRequired,
  findWorkpads: PropTypes.func.isRequired,
  removeWorkpad: PropTypes.func.isRequired,
  setDeleteWorkpad: PropTypes.func.isRequired,
  deleteWorkpad: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
