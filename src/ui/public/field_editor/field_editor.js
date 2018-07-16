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

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { intersection, union, get } from 'lodash';

import {
  GetEnabledScriptingLanguagesProvider,
  getDeprecatedScriptingLanguages,
  getSupportedScriptingLanguages,
} from 'ui/scripting_languages';

import {
  fieldFormats
} from 'ui/registry/field_formats';

import {
  getDocLink
} from 'ui/documentation_links';

import {
  toastNotifications
} from 'ui/notify';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiOverlayMask,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import {
  ScriptingDisabledCallOut,
  ScriptingWarningCallOut,
  ScriptingHelpFlyout,
} from './components/scripting_call_outs';

import {
  FieldFormatEditor
} from './components/field_format_editor';

import { FIELD_TYPES_BY_LANG, DEFAULT_FIELD_TYPES } from './constants';
import { copyField, getDefaultFormat } from './lib';

import { ReactI18n } from '@kbn/i18n';

const { injectI18n, FormattedMessage } = ReactI18n;

export class FieldEditorComponent extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    field: PropTypes.object.isRequired,
    helpers: PropTypes.shape({
      Field: PropTypes.func.isRequired,
      getConfig: PropTypes.func.isRequired,
      $http: PropTypes.func.isRequired,
      fieldFormatEditors: PropTypes.object.isRequired,
      redirectAway: PropTypes.func.isRequired,
    })
  };

  constructor(props) {
    super(props);

    const {
      field,
      indexPattern,
      helpers: { Field },
    } = props;

    this.state = {
      isReady: false,
      isCreating: false,
      isDeprecatedLang: false,
      scriptingLangs: [],
      fieldTypes: [],
      fieldTypeFormats: [],
      existingFieldNames: indexPattern.fields.map(f => f.name),
      field: copyField(field, indexPattern, Field),
      fieldFormatId: undefined,
      fieldFormatParams: {},
      showScriptingHelp: false,
      showDeleteModal: false,
      hasFormatError: false,
    };
    this.supportedLangs = getSupportedScriptingLanguages();
    this.deprecatedLangs = getDeprecatedScriptingLanguages();
    this.init();
  }

  async init() {
    const { $http } = this.props.helpers;
    const { field } = this.state;
    const { indexPattern } = this.props;

    const getEnabledScriptingLanguages = new GetEnabledScriptingLanguagesProvider($http);
    const enabledLangs = await getEnabledScriptingLanguages();
    const scriptingLangs = intersection(enabledLangs, union(this.supportedLangs, this.deprecatedLangs));
    field.lang = scriptingLangs.includes(field.lang) ? field.lang : undefined;

    const fieldTypes = get(FIELD_TYPES_BY_LANG, field.lang, DEFAULT_FIELD_TYPES);
    field.type = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];

    const DefaultFieldFormat = fieldFormats.getDefaultType(field.type);
    const fieldTypeFormats = [
      getDefaultFormat(DefaultFieldFormat),
      ...fieldFormats.byFieldType[field.type],
    ];

    this.setState({
      isReady: true,
      isCreating: !indexPattern.fields.byName[field.name],
      isDeprecatedLang: this.deprecatedLangs.includes(field.lang),
      errors: [],
      scriptingLangs,
      fieldTypes,
      fieldTypeFormats,
      fieldFormatId: get(indexPattern, ['fieldFormatMap', field.name, 'type', 'id']),
      fieldFormatParams: field.format.params(),
    });
  }

  onFieldChange = (fieldName, value) => {
    const field = this.state.field;
    field[fieldName] = value;
    this.forceUpdate();
  }

  onTypeChange = (type) => {
    const { getConfig } = this.props.helpers;
    const { field } = this.state;
    const DefaultFieldFormat = fieldFormats.getDefaultType(type);
    field.type = type;

    const fieldTypeFormats = [
      getDefaultFormat(DefaultFieldFormat),
      ...fieldFormats.byFieldType[field.type],
    ];

    const FieldFormat = fieldTypeFormats[0];
    field.format = new FieldFormat(null, getConfig);

    this.setState({
      fieldTypeFormats,
      fieldFormatId: FieldFormat.id,
      fieldFormatParams: field.format.params(),
    });
  }

  onLangChange = (lang) => {
    const { field } = this.state;
    const fieldTypes = get(FIELD_TYPES_BY_LANG, lang, DEFAULT_FIELD_TYPES);
    field.lang = lang;
    field.type = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];

    this.setState({
      fieldTypes,
    });
  }

  onFormatChange = (formatId, params) => {
    const { getConfig } = this.props.helpers;
    const { field, fieldTypeFormats } = this.state;
    const FieldFormat = fieldTypeFormats.find((format) => format.id === formatId) || fieldTypeFormats[0];
    field.format = new FieldFormat(params, getConfig);

    this.setState({
      fieldFormatId: FieldFormat.id,
      fieldFormatParams: field.format.params(),
    });
  }

  onFormatParamsChange = (newParams) => {
    const { fieldFormatId } = this.state;
    this.onFormatChange(fieldFormatId, newParams);
  }

  onFormatParamsError = (error) => {
    this.setState({
      hasFormatError: !!error,
    });
  }

  isDuplicateName() {
    const { isCreating, field, existingFieldNames } = this.state;
    return isCreating && existingFieldNames.includes(field.name);
  }

  renderName() {
    const { isCreating, field } = this.state;
    const isInvalid = !field.name || !field.name.trim();

    return isCreating ? (
      <EuiFormRow
        label={this.props.intl.formatMessage({ id: 'common.ui.fieldEditor.name.label', defaultMessage: 'Name' })}
        helpText={this.isDuplicateName() ? (
          <span>
            <EuiIcon type="alert" color="warning" size="s" />&nbsp;
            <FormattedMessage
              id="common.ui.fieldEditor.mappingConflict.label.detail"
              // eslint-disable-next-line max-len
              defaultMessage="{mappingConflict} You already have a field with the name {fieldName}. Naming your scripted field with the same name means you won't be able to query both fields at the same time."
              values={{
                mappingConflict: (
                  <strong>
                    <FormattedMessage
                      id="common.ui.fieldEditor.mappingConflict.label.mappingConflict"
                      defaultMessage="Mapping Conflict:"
                    />
                  </strong>
                ),
                fieldName: <EuiCode>{field.name}</EuiCode>
              }}
            />
          </span>
        ) : null}
        isInvalid={isInvalid}
        error={isInvalid ? this.props.intl.formatMessage({
          id: 'common.ui.fieldEditor.name.errorMessage',
          defaultMessage: 'Name is required'
        }) : null}
      >
        <EuiFieldText
          value={field.name || ''}
          placeholder={this.props.intl.formatMessage(
            { id: 'common.ui.fieldEditor.name.placeholder', defaultMessage: 'New scripted field' })}
          data-test-subj="editorFieldName"
          onChange={(e) => { this.onFieldChange('name', e.target.value); }}
          isInvalid={isInvalid}
        />
      </EuiFormRow>
    ) : null;
  }

  renderLanguage() {
    const { field, scriptingLangs, isDeprecatedLang } = this.state;

    return field.scripted ? (
      <EuiFormRow
        label={this.props.intl.formatMessage({ id: 'common.ui.fieldEditor.language.label', defaultMessage: 'Language' })}
        helpText={isDeprecatedLang ? (
          <span>
            <EuiIcon type="alert" color="warning" size="s" />&nbsp;
            <strong><FormattedMessage
              id="common.ui.fieldEditor.warning.header"
              defaultMessage="Deprecation Warning:"
            />
            </strong>&nbsp;
            <FormattedMessage
              id="common.ui.fieldEditor.warning.label.detail"
              // eslint-disable-next-line max-len
              defaultMessage="{language} is deprecated and support will be removed in the next major version of Kibana and Elasticsearch. We recommend using {painlessLink} for new scripted fields."
              values={{
                language: <EuiCode>{field.lang}</EuiCode>,
                painlessLink: (
                  <EuiLink target="_window" href={getDocLink('scriptedFields.painless')}>
                    <FormattedMessage
                      id="common.ui.fieldEditor.warning.label.painlessLink"
                      defaultMessage="Painless"
                    />
                  </EuiLink>
                )
              }}
            />
          </span>
        ) : null}
      >
        <EuiSelect
          value={field.lang}
          options={scriptingLangs.map(lang => { return { value: lang, text: lang }; })}
          data-test-subj="editorFieldLang"
          onChange={(e) => { this.onLangChange(e.target.value); }}
        />
      </EuiFormRow>
    ) : null;
  }

  renderType() {
    const { field, fieldTypes } = this.state;

    return (
      <EuiFormRow label={this.props.intl.formatMessage({ id: 'common.ui.fieldEditor.type.label', defaultMessage: 'Type' })}>
        <EuiSelect
          value={field.type}
          disabled={!field.scripted}
          options={fieldTypes.map(type => { return { value: type, text: type }; })}
          data-test-subj="editorFieldType"
          onChange={(e) => {
            this.onTypeChange(e.target.value);
          }}
        />
      </EuiFormRow>
    );
  }

  renderFormat() {
    const { field, fieldTypeFormats, fieldFormatId, fieldFormatParams } = this.state;
    const { fieldFormatEditors } = this.props.helpers;
    const defaultFormat = fieldTypeFormats[0] && fieldTypeFormats[0].resolvedTitle;
    const label = defaultFormat
      ? (<FormattedMessage
        id="common.ui.fieldEditor.defaultFormat.header"
        defaultMessage="Format (Default: {defaultFormat})"
        values={{
          defaultFormat: <EuiCode>{defaultFormat}</EuiCode>
        }}
      />)
      : (<FormattedMessage
        id="common.ui.fieldEditor.format.header"
        defaultMessage="Format"
      />);

    return (
      <Fragment>
        <EuiFormRow
          label={label}
          helpText={
            <FormattedMessage
              id="common.ui.fieldEditor.format.label"
              // eslint-disable-next-line max-len
              defaultMessage="Formatting allows you to control the way that specific values are displayed. It can also cause values to be completely changed and prevent highlighting in Discover from working."
            />
          }
        >
          <EuiSelect
            value={fieldFormatId}
            options={fieldTypeFormats.map(format => { return { value: format.id || '', text: format.title }; })}
            data-test-subj="editorSelectedFormatId"
            onChange={(e) => { this.onFormatChange(e.target.value); }}
          />
        </EuiFormRow>
        { fieldFormatId ? (
          <FieldFormatEditor
            fieldType={field.type}
            fieldFormat={field.format}
            fieldFormatId={fieldFormatId}
            fieldFormatParams={fieldFormatParams}
            fieldFormatEditors={fieldFormatEditors}
            onChange={this.onFormatParamsChange}
            onError={this.onFormatParamsError}
          />
        ) : null }
      </Fragment>
    );
  }

  renderPopularity() {
    const { field } = this.state;

    return (
      <EuiFormRow label={this.props.intl.formatMessage({ id: 'common.ui.fieldEditor.popularity.label', defaultMessage: 'Popularity' })}>
        <EuiFieldNumber
          value={field.count}
          data-test-subj="editorFieldCount"
          onChange={(e) => { this.onFieldChange('count', e.target.value ? Number(e.target.value) : '');}}
        />
      </EuiFormRow>
    );
  }

  renderScript() {
    const { field } = this.state;
    const isInvalid = !field.script || !field.script.trim();

    return field.scripted ? (
      <EuiFormRow
        label={this.props.intl.formatMessage({ id: 'common.ui.fieldEditor.script.label', defaultMessage: 'Script' })}
        helpText={(
          <EuiLink onClick={this.showScriptingHelp}>
            {this.props.intl.formatMessage({ id: 'common.ui.fieldEditor.script.help.label', defaultMessage: 'Scripting help' })}
          </EuiLink>
        )}
        isInvalid={isInvalid}
        error={isInvalid
          ? this.props.intl.formatMessage({ id: 'common.ui.fieldEditor.script.errorMessage', defaultMessage: 'Script is required' })
          : null}
      >
        <EuiTextArea
          value={field.script}
          data-test-subj="editorFieldScript"
          onChange={(e) => { this.onFieldChange('script', e.target.value); }}
          isInvalid={isInvalid}
        />
      </EuiFormRow>
    ) : null;
  }

  showScriptingHelp = () => {
    this.setState({
      showScriptingHelp: true
    });
  }

  hideScriptingHelp = () => {
    this.setState({
      showScriptingHelp: false
    });
  }

  renderDeleteModal = () => {
    const { field } = this.state;

    return this.state.showDeleteModal ? (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={this.props.intl.formatMessage(
            { id: 'common.ui.fieldEditor.deleteField.header', defaultMessage: 'Delete field \'{fieldName}\'' },
            { fieldName: field.name })}
          onCancel={this.hideDeleteModal}
          onConfirm={() => {
            this.hideDeleteModal();
            this.deleteField(this.props.intl);
          }}
          cancelButtonText={this.props.intl.formatMessage(
            { id: 'common.ui.fieldEditor.deleteField.cancel.button', defaultMessage: 'Cancel' })}
          confirmButtonText={this.props.intl.formatMessage(
            { id: 'common.ui.fieldEditor.deleteField.delete.button', defaultMessage: 'Delete' })}
          buttonColor="danger"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>
            <FormattedMessage
              id="common.ui.fieldEditor.deleteField.label"
              defaultMessage="You can't recover a deleted field.{newLine}Are you sure you want to do this?"
              values={{ newLine: <p/> }}
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    ) : null;
  }

  showDeleteModal = () => {
    this.setState({
      showDeleteModal: true
    });
  }

  hideDeleteModal = () => {
    this.setState({
      showDeleteModal: false
    });
  }

  renderActions() {
    const { isCreating, field } = this.state;
    const { redirectAway } = this.props.helpers;

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={this.saveField}
            isDisabled={this.isSavingDisabled()}
            data-test-subj="fieldSaveButton"
          >
            {isCreating ?
              <FormattedMessage
                id="common.ui.fieldEditor.actions.create.button"
                defaultMessage="Create field"
              />
              :
              <FormattedMessage
                id="common.ui.fieldEditor.actions.save.button"
                defaultMessage="Save field"
              />}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={redirectAway}
            data-test-subj="fieldCancelButton"
          >
            <FormattedMessage
              id="common.ui.fieldEditor.actions.cancel.button"
              defaultMessage="Cancel"
            />

          </EuiButtonEmpty>
        </EuiFlexItem>
        {
          !isCreating && field.scripted ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="danger"
                onClick={this.showDeleteModal}
              >
                <FormattedMessage
                  id="common.ui.fieldEditor.actions.delete.button"
                  defaultMessage="Delete"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null
        }
      </EuiFlexGroup>
    );
  }

  deleteField = () => {
    const { redirectAway } = this.props.helpers;
    const { indexPattern } = this.props;
    const { field } = this.state;
    const remove = indexPattern.removeScriptedField(field.name);

    if(remove) {
      remove.then(() => {
        toastNotifications.addSuccess(this.props.intl.formatMessage(
          { id: 'common.ui.fieldEditor.deleteField.deleted.header', defaultMessage: 'Deleted \'{fieldName}\'' },
          { fieldName: field.name }));
        redirectAway();
      });
    } else {
      redirectAway();
    }
  }

  saveField = () => {
    const { redirectAway } = this.props.helpers;
    const { indexPattern, intl } = this.props;
    const { fieldFormatId } = this.state;

    const field = this.state.field.toActualField();
    const index = indexPattern.fields.findIndex(f => f.name === field.name);

    if (index > -1) {
      indexPattern.fields.splice(index, 1, field);
    } else {
      indexPattern.fields.push(field);
    }

    if (!fieldFormatId) {
      indexPattern.fieldFormatMap[field.name] = {};
    } else {
      indexPattern.fieldFormatMap[field.name] = field.format;
    }

    return indexPattern.save()
      .then(function () {
        toastNotifications.addSuccess(intl.formatMessage(
          { id: 'common.ui.fieldEditor.deleteField.saved.header', defaultMessage: 'Saved \'{fieldName}\'' },
          { fieldName: field.name }));
        redirectAway();
      });
  }

  isSavingDisabled() {
    const { field, hasFormatError } = this.state;

    if(
      hasFormatError
      || !field.name
      || !field.name.trim()
      || (field.scripted && (!field.script || !field.script.trim()))
    ) {
      return true;
    }

    return false;
  }

  render() {
    const { isReady, isCreating, scriptingLangs, field, showScriptingHelp } = this.state;

    return isReady ? (
      <div>
        <EuiText>
          <h3>{
            isCreating
              ? <FormattedMessage
                id="common.ui.fieldEditor.create.header"
                defaultMessage="Create scripted field"
              />
              : <FormattedMessage
                id="common.ui.fieldEditor.edit.header"
                defaultMessage="Edit {fieldName}"
                values={{ fieldName: field.name }}
              />
          }
          </h3>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm>
          <ScriptingDisabledCallOut isVisible={field.scripted && !scriptingLangs.length} />
          <ScriptingWarningCallOut isVisible={field.scripted} />
          <ScriptingHelpFlyout
            isVisible={field.scripted && showScriptingHelp}
            onClose={this.hideScriptingHelp}
          />
          {this.renderName()}
          {this.renderLanguage()}
          {this.renderType()}
          {this.renderFormat()}
          {this.renderPopularity()}
          {this.renderScript()}
          {this.renderActions()}
          {this.renderDeleteModal()}
        </EuiForm>
        <EuiSpacer size="l" />
      </div>
    ) : null;
  }
}


export const FieldEditor = injectI18n(FieldEditorComponent);
