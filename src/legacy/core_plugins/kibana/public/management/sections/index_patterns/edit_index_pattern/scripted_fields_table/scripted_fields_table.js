/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
import { i18n } from '@kbn/i18n';

import {
  Table,
  Header,
  CallOuts,
} from './components';

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
    };
  }

  UNSAFE_componentWillMount() {
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

  getFilteredItems = () => {
    const { fields } = this.state;
    const { fieldFilter, scriptedFieldLanguageFilter } = this.props;

    let languageFilteredFields = fields;

    if (scriptedFieldLanguageFilter) {
      languageFilteredFields = fields.filter(
        field => field.lang === this.props.scriptedFieldLanguageFilter
      );
    }

    let filteredFields = languageFilteredFields;

    if (fieldFilter) {
      const normalizedFieldFilter = this.props.fieldFilter.toLowerCase();
      filteredFields = languageFilteredFields.filter(
        field => field.name.toLowerCase().includes(normalizedFieldFilter)
      );
    }

    return filteredFields;
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

    indexPattern.removeScriptedField(fieldToDelete);
    onRemoveField && onRemoveField();
    this.fetchFields();
    this.hideDeleteConfirmationModal();
  }

  renderDeleteConfirmationModal() {
    const { fieldToDelete } = this.state;

    if (!fieldToDelete) {
      return null;
    }

    const title = i18n.translate('kbn.management.editIndexPattern.scripted.deleteFieldLabel',
      { defaultMessage: 'Delete scripted field \'{fieldName}\'?', values: { fieldName: fieldToDelete.name } });
    const cancelButtonText = i18n.translate('kbn.management.editIndexPattern.scripted.deleteField.cancelButton',
      { defaultMessage: 'Cancel' });
    const confirmButtonText = i18n.translate('kbn.management.editIndexPattern.scripted.deleteField.deleteButton',
      { defaultMessage: 'Delete' });

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={this.hideDeleteConfirmationModal}
          onConfirm={this.deleteField}
          cancelButtonText={cancelButtonText}
          confirmButtonText={confirmButtonText}
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

    const items = this.getFilteredItems();

    return (
      <div>
        <Header addScriptedFieldUrl={helpers.getRouteHref(indexPattern, 'addField')} />

        {this.renderCallOuts()}

        <EuiSpacer size="l" />

        <Table
          indexPattern={indexPattern}
          items={items}
          editField={field => this.props.helpers.redirectToRoute(field, 'edit')}
          deleteField={this.startDeleteField}
        />

        {this.renderDeleteConfirmationModal()}
      </div>
    );
  }
}
