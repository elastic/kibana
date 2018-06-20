import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { sortByOrder } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiBasicTable, EuiButtonIcon, EuiSpacer } from '@elastic/eui';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { WorkpadUpload } from './workpad_upload';
import { WorkpadCreate } from './workpad_create';
import { WorkpadSearch } from './workpad_search';

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
    sortField: '@timestamp',
    sortDirection: 'desc',
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

  downloadWorkpad = workpad => {
    this.props.downloadWorkpad(workpad.id);
  };

  onTableChange = ({ sort = {} }) => {
    const { field: sortField, direction: sortDirection } = sort;
    this.setState({
      sortField,
      sortDirection,
    });
  };

  renderWorkpadTable = () => {
    const { sortField, sortDirection } = this.state;
    const { workpads } = this.props.workpads;

    const actions = [
      {
        render: workpad => (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="exportAction"
                onClick={() => this.downloadWorkpad(workpad)}
                aria-label="Export Workpad"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                onClick={() => this.removeConfirm(workpad)}
                aria-label="Delete Workpad"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ];

    const columns = [
      {
        field: 'name',
        name: 'Workpad Name',
        sortable: true,
        dataType: 'string',
        render: (name, workpad) => {
          const workpadName = workpad.name.length ? workpad.name : <em>{workpad.id}</em>;

          return (
            <Link
              name="loadWorkpad"
              params={{ id: workpad.id }}
              aria-label={`Load workpad ${workpadName}`}
            >
              {workpadName}
            </Link>
          );
        },
      },
      {
        field: '@created',
        name: 'Created',
        sortable: true,
        dataType: 'date',
        width: '20%',
        render: date => formatDate(date),
      },
      {
        field: '@timestamp',
        name: 'Updated',
        sortable: true,
        dataType: 'date',
        width: '20%',
        render: date => formatDate(date),
      },
      { name: '', actions, width: '5%' },
    ];

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    const sortedWorkpads = sortByOrder(
      workpads,
      [sortField, '@timestamp'],
      [sortDirection, 'desc']
    );

    return (
      <EuiBasicTable
        items={sortedWorkpads}
        columns={columns}
        sorting={sorting}
        message="No matching workpads found"
        onChange={this.onTableChange}
      />
    );
  };

  render() {
    const { deletingWorkpad, createPending } = this.state;
    const isLoading = this.props.workpads == null;

    return (
      <div className="canvas__workpad_loader">
        <WorkpadUpload onUpload={this.uploadWorkpad}>
          <EuiFlexGroup gutterSize="s" className="canvas__workpad_loader--controls">
            <EuiFlexItem grow={false}>
              <WorkpadCreate createPending={createPending} onCreate={this.createWorkpad} />
            </EuiFlexItem>
            <EuiFlexItem className="canvas__workpad_loader--search">
              <WorkpadSearch onChange={this.props.findWorkpads} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          {createPending && <div>Creating Workpad...</div>}
          {!createPending && isLoading && <div>Fetching Workpads...</div>}
          {!createPending && !isLoading && this.renderWorkpadTable()}
        </WorkpadUpload>

        <ConfirmModal
          isOpen={deletingWorkpad.id != null}
          title="Remove Workpad"
          message={`Are you sure you want to remove the workpad '${deletingWorkpad.name}'?`}
          confirmButtonText="Remove"
          onConfirm={() => this.removeWorkpad(deletingWorkpad.id)}
          onCancel={this.closeRemoveConfirm}
        />
      </div>
    );
  }
}
