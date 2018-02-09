import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getSupportedScriptingLanguages, getDeprecatedScriptingLanguages } from 'ui/scripting_languages';
import { documentationLinks } from 'ui/documentation_links';

import {
  EuiButton,
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { Table } from './components/table';
import { Header } from './components/header';
import { CallOuts } from './components/call_outs';
import { getTableOfRecordsState, DEFAULT_TABLE_OF_RECORDS_STATE } from './lib';


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
      ...DEFAULT_TABLE_OF_RECORDS_STATE,
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
    if (this.props.scriptedFieldLanguageFilter !== nextProps.scriptedFieldLanguageFilter) {
      this.setState(this.computeTableState(this.state.criteria, nextProps));
    }
  }

  computeTableState(criteria, props = this.props, fields = this.state.fields) {
    let items = fields;
    if (props.fieldFilter) {
      const fieldFilter = props.fieldFilter.toLowerCase();
      items = items.filter(field => field.name.toLowerCase().includes(fieldFilter));
    }
    if (props.scriptedFieldLanguageFilter) {
      items = items.filter(field => field.lang === props.scriptedFieldLanguageFilter);
    }

    return getTableOfRecordsState(items, criteria);
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
      data,
      criteria: {
        page,
        sort,
      },
      fields,
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
        <Header/>
        {this.renderCallOuts()}
        <EuiButton
          data-test-subj="addScriptedFieldLink"
          href={helpers.getRouteHref(indexPattern, 'addField')}
        >
          Add scripted field
        </EuiButton>
        <EuiSpacer size="l" />
        { fields.length > 0 ?
          <Table
            indexPattern={indexPattern}
            model={model}
            editField={field => this.props.helpers.redirectToRoute(field, 'edit')}
            deleteField={this.startDeleteField}
            onDataCriteriaChange={this.onDataCriteriaChange}
          />
          : null
        }
        {this.renderDeleteConfirmationModal()}
      </div>
    );
  }
}
