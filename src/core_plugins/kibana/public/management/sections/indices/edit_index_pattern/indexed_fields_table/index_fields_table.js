import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Table } from './components/table';
import { getTableOfRecordsState, DEFAULT_TABLE_OF_RECORDS_STATE } from './lib';


export class IndexedFieldsTable extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    fieldFilter: PropTypes.string,
    indexedFieldTypeFilter: PropTypes.string,
  }

  constructor(props) {
    super(props);

    this.state = {
      fields: [],
      ...DEFAULT_TABLE_OF_RECORDS_STATE,
    };
  }

  componentWillMount() {
    this.fetchFields();
  }

  fetchFields = async () => {
    const fields = await this.props.indexPattern.getNonScriptedFields();
    this.setState({
      fields,
      ...this.computeTableState(this.state.criteria, this.props, fields)
    });
  }

  onDataCriteriaChange = criteria => {
    this.setState(this.computeTableState(criteria));
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.fieldFilter !== nextProps.fieldFilter) {
      this.setState(this.computeTableState(this.state.criteria, nextProps));
    }
    if (this.props.indexedFieldTypeFilter !== nextProps.indexedFieldTypeFilter) {
      this.setState(this.computeTableState(this.state.criteria, nextProps));
    }
  }

  computeTableState(criteria, props = this.props, fields = this.state.fields) {
    let items = fields;
    if (props.fieldFilter) {
      const fieldFilter = props.fieldFilter.toLowerCase();
      items = items.filter(field => field.name.toLowerCase().includes(fieldFilter));
    }
    if (props.indexedFieldTypeFilter) {
      items = items.filter(field => field.type === props.indexedFieldTypeFilter);
    }

    return getTableOfRecordsState(items, criteria);
  }

  // startDeleteField = field => {
  //   this.setState({ fieldToDelete: field, isDeleteConfirmationModalVisible: true });
  // }
  //
  // hideDeleteConfirmationModal = () => {
  //   this.setState({ fieldToDelete: undefined, isDeleteConfirmationModalVisible: false });
  // }
  //
  // deleteField = () =>  {
  //   const { indexPattern } = this.props;
  //   const { fieldToDelete } = this.state;
  //
  //   indexPattern.removeScriptedField(fieldToDelete.name);
  //   this.fetchFields();
  //   this.hideDeleteConfirmationModal();
  // }
  //
  // renderDeleteConfirmationModal() {
  //   const { fieldToDelete } = this.state;
  //
  //   if (!fieldToDelete) {
  //     return null;
  //   }
  //
  //   return (
  //     <EuiOverlayMask>
  //       <EuiConfirmModal
  //         title={`Delete scripted field '${fieldToDelete.name}'?`}
  //         onCancel={this.hideDeleteConfirmationModal}
  //         onConfirm={this.deleteField}
  //         cancelButtonText="Cancel"
  //         confirmButtonText="Delete"
  //         defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
  //       />
  //     </EuiOverlayMask>
  //   );
  // }
  //
  // renderNoFieldsFound() {
  //   const { fields } = this.state;
  //
  //   if (fields.length > 0) {
  //     return null;
  //   }
  //
  //   return (
  //     <EuiText>
  //       No scripted fields found.
  //     </EuiText>
  //   );
  // }

  render() {
    const {
      indexPattern,
    } = this.props;

    const {
      data,
      criteria: {
        page,
        sort,
      },
    } = this.state;

    const model = {
      data,
      criteria: {
        page,
        sort,
      },
    };

    return (
      <div>
        <Table
          indexPattern={indexPattern}
          model={model}
          editField={() => {}}
          deleteField={() => {}}
          onDataCriteriaChange={this.onDataCriteriaChange}
        />
      </div>
    );
  }
}
