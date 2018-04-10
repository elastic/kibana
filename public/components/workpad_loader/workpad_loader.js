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

  async componentWillMount() {
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

  render() {
    const { deletingWorkpad } = this.state;
    const { workpads } = this.props;
    const isLoading = this.props.workpads == null;

    const wrapContent = content => (
      <div className="canvas__workpad_loader">
        <WorkpadUpload onUpload={this.uploadWorkpad}>
          <Form className="canvas__workpad_loader--controls">
            <WorkpadCreate onCreate={this.createWorkpad} />
            <WorkpadSearch onChange={this.props.findWorkpads} />
          </Form>

          {content}
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

    if (isLoading) return wrapContent(<div>Fetching Workpads...</div>);

    if (this.state.createPending) return wrapContent(<div>Creating Workpad...</div>);

    return wrapContent(
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
          {isLoading && (
            <tr>
              <td colSpan="3">Fetching workpads...</td>
            </tr>
          )}
          {!isLoading &&
            workpads.total === 0 && (
              <tr>
                <td colSpan="3">No matching workpads found</td>
              </tr>
            )}
          {!isLoading &&
            workpads.workpads.map(wp => (
              <tr key={wp.id} className="canvas__workpad_loader--workpad">
                <td width="97%" className="canvas__workpad_loader--name">
                  <Link
                    name="loadWorkpad"
                    params={{ id: wp.id }}
                    aria-label={`Load workpad ${wp.id}`}
                  >
                    {wp.name}
                  </Link>
                </td>
                <td width="1%" className="canvas__workpad_loader--created">
                  {formatDate(wp['@created'])}
                </td>
                <td width="1%" className="canvas__workpad_loader--updated">
                  {formatDate(wp['@timestamp'])}
                </td>
                <td width="1%" className="canvas__workpad_loader--export">
                  <span
                    onClick={() => this.props.downloadWorkpad(wp.id)}
                    className="fa fa-download"
                  />
                </td>
                <td width="1%" className="canvas__workpad_loader--delete">
                  <span onClick={() => this.removeConfirm(wp)} className="fa fa-trash" />
                </td>
              </tr>
            ))}
        </tbody>
      </Table>
    );
  }
}
