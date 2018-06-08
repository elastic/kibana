import React from 'react';
import PropTypes from 'prop-types';
import { Form, Table } from 'react-bootstrap';
import moment from 'moment';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { WorkpadUpload } from './workpad_upload';
import { WorkpadCreate } from './workpad_create';
import { WorkpadSearch } from './workpad_search';
import './workpad_loader.less';

const formatDate = date => date && moment(date).format('MMM D, YYYY @ h:mma');

export class WorkpadLoader extends React.PureComponent {
  static propTypes = {
    workpadId: PropTypes.string.isRequired,
    createWorkpad: PropTypes.func.isRequired,
    findWorkpads: PropTypes.func.isRequired,
    downloadWorkpad: PropTypes.func.isRequired,
    removeWorkpad: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    workpads: PropTypes.object,
  };

  state = {
    deletingWorkpad: {},
    createPending: false,
  };

  async componentDidMount() {
    // on component load, kick off the workpad search
    this.props.findWorkpads();
  }

  componentWillReceiveProps(newProps) {
    // the workpadId prop will change when a is created or loaded, close the toolbar when it does
    const { workpadId, onClose } = this.props;
    if (workpadId !== newProps.workpadId) onClose();
  }

  // create new empty workpad
  createWorkpad = () => {
    this.setState({ createPending: true });
    this.props.createWorkpad();
  };

  // create new workpad from uploaded JSON
  uploadWorkpad = workpad => {
    this.setState({ createPending: true });
    this.props.createWorkpad(workpad);
  };

  // Workpad remove methods
  removeConfirm = deletingWorkpad => this.setState({ deletingWorkpad });

  closeRemoveConfirm = () => this.setState({ deletingWorkpad: {} });

  removeWorkpad = workpadId => {
    this.props.removeWorkpad(workpadId);
    this.closeRemoveConfirm();
  };

  renderWorkpadTable = () => {
    const { workpads } = this.props;

    return (
      <Table condensed className="canvas__workpad_loader--workpads">
        <thead>
          <tr>
            <th>Workpad name</th>
            <th>Created</th>
            <th>Updated</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {workpads.total === 0 && (
            <tr>
              <td colSpan="3">No matching workpads found</td>
            </tr>
          )}
          {workpads.workpads.map(this.renderWorkpadRow)}
        </tbody>
      </Table>
    );
  };

  renderWorkpadRow = workpad => {
    const workpadName = workpad.name.length ? workpad.name : <em>{workpad.id}</em>;

    return (
      <tr key={workpad.id} className="canvas__workpad_loader--workpad">
        <td width="97%" className="canvas__workpad_loader--name">
          <Link
            name="loadWorkpad"
            params={{ id: workpad.id }}
            aria-label={`Load workpad ${workpadName}`}
          >
            {workpadName}
          </Link>
        </td>
        <td width="1%" className="canvas__workpad_loader--created">
          {formatDate(workpad['@created'])}
        </td>
        <td width="1%" className="canvas__workpad_loader--updated">
          {formatDate(workpad['@timestamp'])}
        </td>
        <td width="1%" className="canvas__workpad_loader--export">
          <span onClick={() => this.props.downloadWorkpad(workpad.id)} className="fa fa-download" />
        </td>
        <td width="1%" className="canvas__workpad_loader--delete">
          <span onClick={() => this.removeConfirm(workpad)} className="fa fa-trash" />
        </td>
      </tr>
    );
  };

  render() {
    const { deletingWorkpad, createPending } = this.state;
    const isLoading = this.props.workpads == null;

    return (
      <div className="canvas__workpad_loader">
        <WorkpadUpload onUpload={this.uploadWorkpad}>
          <Form className="canvas__workpad_loader--controls">
            <WorkpadCreate onCreate={this.createWorkpad} />
            <WorkpadSearch onChange={this.props.findWorkpads} />
          </Form>

          {createPending && <div>Creating Workpad...</div>}
          {!createPending && isLoading && <div>Fetching Workpads...</div>}
          {!createPending && !isLoading && this.renderWorkpadTable()}
        </WorkpadUpload>

        <ConfirmModal
          isOpen={deletingWorkpad.id != null}
          message={`Are you sure you want to remove the workpad '${deletingWorkpad.name}'?`}
          confirmButtonText="Remove"
          onConfirm={() => this.removeWorkpad(deletingWorkpad.id)}
          onCancel={this.closeRemoveConfirm}
        />
      </div>
    );
  }
}
