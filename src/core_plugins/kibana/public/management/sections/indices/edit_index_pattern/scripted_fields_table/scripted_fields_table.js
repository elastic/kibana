import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getSupportedScriptingLanguages, getDeprecatedScriptingLanguages } from 'ui/scripting_languages';
import { documentationLinks } from 'ui/documentation_links';

import {
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import {
  Table,
  Header,
  CallOuts,
} from './components';

import { getItemsOnPage } from './lib';

export class ScriptedFieldsTable extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    fieldFilter: PropTypes.string,
    scriptedFieldLanguageFilter: PropTypes.string,
    helpers: PropTypes.shape({
      redirectToRoute: PropTypes.func.isRequired,
      getRouteHref: PropTypes.func.isRequired,
    }),
    onRemoveField: PropTypes.func,
  }

  constructor(props) {
    super(props);

    this.state = {
      deprecatedLangsInUse: [],
      fieldToDelete: undefined,
      isDeleteConfirmationModalVisible: false,
      fields: [],
      pageIndex: 0,
      pageSize: 10,
      sortField: 'name',
      sortDirection: 'asc',
    };
  }

  componentWillMount() {
    this.fetchFields();
  }

  fetchFields = async () => {
    const fields = await this.props.indexPattern.getScriptedFields();

    const deprecatedLangsInUse = [];
    const deprecatedLangs = getDeprecatedScriptingLanguages();
    const supportedLangs = getSupportedScriptingLanguages();

    for (const { lang } of fields) {
      if (deprecatedLangs.includes(lang) || !supportedLangs.includes(lang)) {
        deprecatedLangsInUse.push(lang);
      }
    }

    this.setState({
      fields,
      deprecatedLangsInUse,
    });
  }

  onTableChange = (
    pageIndex = this.state.pageIndex,
    pageSize = this.state.pageSize,
    sortField = this.state.sortField,
    sortDirection = this.state.sortDirection
  ) => {
    this.setState({ pageIndex, pageSize, sortField, sortDirection });
  };

  getItemsOnPage = () => {
    const { fields, pageIndex, pageSize, sortField, sortDirection } = this.state;
    const { fieldFilter, scriptedFieldLanguageFilter } = this.props;

    let items = fields;

    if (fieldFilter) {
      const normalizedFieldFilter = this.props.fieldFilter.toLowerCase();
      items = items.filter(field => field.name.toLowerCase().includes(normalizedFieldFilter));
    }

    if (scriptedFieldLanguageFilter) {
      items = items.filter(field => field.lang === this.props.scriptedFieldLanguageFilter);
    }

    return getItemsOnPage(items, pageIndex, pageSize, sortField, sortDirection);
  }

  renderCallOuts() {
    const { deprecatedLangsInUse } = this.state;

    return (
      <CallOuts
        deprecatedLangsInUse={deprecatedLangsInUse}
        painlessDocLink={documentationLinks.scriptedFields.painless}
      />
    );
  }

  startDeleteField = field => {
    this.setState({ fieldToDelete: field, isDeleteConfirmationModalVisible: true });
  }

  hideDeleteConfirmationModal = () => {
    this.setState({ fieldToDelete: undefined, isDeleteConfirmationModalVisible: false });
  }

  deleteField = () =>  {
    const { indexPattern, onRemoveField } = this.props;
    const { fieldToDelete } = this.state;

    indexPattern.removeScriptedField(fieldToDelete.name);
    onRemoveField && onRemoveField();
    this.fetchFields();
    this.hideDeleteConfirmationModal();
  }

  renderDeleteConfirmationModal() {
    const { fieldToDelete } = this.state;

    if (!fieldToDelete) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={`Delete scripted field '${fieldToDelete.name}'?`}
          onCancel={this.hideDeleteConfirmationModal}
          onConfirm={this.deleteField}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        />
      </EuiOverlayMask>
    );
  }

  render() {
    const {
      helpers,
      indexPattern,
    } = this.props;

    const {
      fields,
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
    } = this.state;

    const itemsOnPage = this.getItemsOnPage();

    return (
      <div>
        <Header addScriptedFieldUrl={helpers.getRouteHref(indexPattern, 'addField')} />

        {this.renderCallOuts()}

        <EuiSpacer size="l" />

        { fields.length > 0 ?
          <Table
            indexPattern={indexPattern}
            itemsOnPage={itemsOnPage}
            totalItemCount={fields.length}
            pageIndex={pageIndex}
            pageSize={pageSize}
            sortField={sortField}
            sortDirection={sortDirection}
            editField={field => this.props.helpers.redirectToRoute(field, 'edit')}
            deleteField={this.startDeleteField}
            onChange={this.onTableChange}
          />
          : null
        }
        {this.renderDeleteConfirmationModal()}
      </div>
    );
  }
}
