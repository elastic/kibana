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

import { getDocLink } from 'ui/documentation_links';

import { toastNotifications } from 'ui/notify';

import { npStart } from 'ui/new_platform';

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiCodeEditor,
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
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import {
  ScriptingDisabledCallOut,
  ScriptingWarningCallOut,
} from './components/scripting_call_outs';

import { ScriptingHelpFlyout } from './components/scripting_help';

import { FieldFormatEditor } from './components/field_format_editor';

import { FIELD_TYPES_BY_LANG, DEFAULT_FIELD_TYPES } from './constants';
import { copyField, getDefaultFormat, executeScript, isScriptValid } from './lib';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

// This loads Ace editor's "groovy" mode, used below to highlight the script.
import 'brace/mode/groovy';

const getFieldFormats = () => npStart.plugins.data.fieldFormats;

export class FieldEditor extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    field: PropTypes.object.isRequired,
    helpers: PropTypes.shape({
      Field: PropTypes.func.isRequired,
      getConfig: PropTypes.func.isRequired,
      $http: PropTypes.func.isRequired,
      fieldFormatEditors: PropTypes.object.isRequired,
      redirectAway: PropTypes.func.isRequired,
    }),
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
      hasScriptError: false,
      isSaving: false,
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
    const scriptingLangs = intersection(
      enabledLangs,
      union(this.supportedLangs, this.deprecatedLangs)
    );
    field.lang = scriptingLangs.includes(field.lang) ? field.lang : undefined;

    const fieldTypes = get(FIELD_TYPES_BY_LANG, field.lang, DEFAULT_FIELD_TYPES);
    field.type = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];

    const fieldFormats = getFieldFormats();

    const fieldTypeFormats = [
      getDefaultFormat(fieldFormats.getDefaultType(field.type, field.esTypes)),
      ...fieldFormats.getByFieldType(field.type),
    ];

    this.setState({
      isReady: true,
      isCreating: !indexPattern.fields.getByName(field.name),
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
  };

  onTypeChange = type => {
    const { getConfig } = this.props.helpers;
    const { field } = this.state;
    const fieldFormats = getFieldFormats();
    const DefaultFieldFormat = fieldFormats.getDefaultType(type);

    field.type = type;

    const fieldTypeFormats = [
      getDefaultFormat(DefaultFieldFormat),
      ...getFieldFormats().getByFieldType(field.type),
    ];

    const FieldFormat = fieldTypeFormats[0];
    field.format = new FieldFormat(null, getConfig);

    this.setState({
      fieldTypeFormats,
      fieldFormatId: FieldFormat.id,
      fieldFormatParams: field.format.params(),
    });
  };

  onLangChange = lang => {
    const { field } = this.state;
    const fieldTypes = get(FIELD_TYPES_BY_LANG, lang, DEFAULT_FIELD_TYPES);
    field.lang = lang;
    field.type = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];

    this.setState({
      fieldTypes,
    });
  };

  onFormatChange = (formatId, params) => {
    const { getConfig } = this.props.helpers;
    const { field, fieldTypeFormats } = this.state;
    const FieldFormat =
      fieldTypeFormats.find(format => format.id === formatId) || fieldTypeFormats[0];

    field.format = new FieldFormat(params, getConfig);

    this.setState({
      fieldFormatId: FieldFormat.id,
      fieldFormatParams: field.format.params(),
    });
  };

  onFormatParamsChange = newParams => {
    const { fieldFormatId } = this.state;
    this.onFormatChange(fieldFormatId, newParams);
  };

  onFormatParamsError = error => {
    this.setState({
      hasFormatError: !!error,
    });
  };

  isDuplicateName() {
    const { isCreating, field, existingFieldNames } = this.state;
    return isCreating && existingFieldNames.includes(field.name);
  }

  renderName() {
    const { isCreating, field } = this.state;
    const isInvalid = !field.name || !field.name.trim();

    return isCreating ? (
      <EuiFormRow
        label={i18n.translate('common.ui.fieldEditor.nameLabel', { defaultMessage: 'Name' })}
        helpText={
          this.isDuplicateName() ? (
            <span>
              <EuiIcon type="alert" color="warning" size="s" />
              &nbsp;
              <FormattedMessage
                id="common.ui.fieldEditor.mappingConflictLabel.mappingConflictDetail"
                defaultMessage="{mappingConflict} You already have a field with the name {fieldName}. Naming your scripted field with
              the same name means you won't be able to query both fields at the same time."
                values={{
                  mappingConflict: (
                    <strong>
                      <FormattedMessage
                        id="common.ui.fieldEditor.mappingConflictLabel.mappingConflictLabel"
                        defaultMessage="Mapping Conflict:"
                      />
                    </strong>
                  ),
                  fieldName: <EuiCode>{field.name}</EuiCode>,
                }}
              />
            </span>
          ) : null
        }
        isInvalid={isInvalid}
        error={
          isInvalid
            ? i18n.translate('common.ui.fieldEditor.nameErrorMessage', {
                defaultMessage: 'Name is required',
              })
            : null
        }
      >
        <EuiFieldText
          value={field.name || ''}
          placeholder={i18n.translate('common.ui.fieldEditor.namePlaceholder', {
            defaultMessage: 'New scripted field',
          })}
          data-test-subj="editorFieldName"
          onChange={e => {
            this.onFieldChange('name', e.target.value);
          }}
          isInvalid={isInvalid}
        />
      </EuiFormRow>
    ) : null;
  }

  renderLanguage() {
    const { field, scriptingLangs, isDeprecatedLang } = this.state;

    return field.scripted ? (
      <EuiFormRow
        label={i18n.translate('common.ui.fieldEditor.languageLabel', {
          defaultMessage: 'Language',
        })}
        helpText={
          isDeprecatedLang ? (
            <span>
              <EuiIcon type="alert" color="warning" size="s" />
              &nbsp;
              <strong>
                <FormattedMessage
                  id="common.ui.fieldEditor.warningHeader"
                  defaultMessage="Deprecation Warning:"
                />
              </strong>
              &nbsp;
              <FormattedMessage
                id="common.ui.fieldEditor.warningLabel.warningDetail"
                defaultMessage="{language} is deprecated and support will be removed in the next major version of Kibana and Elasticsearch.
              We recommend using {painlessLink} for new scripted fields."
                values={{
                  language: <EuiCode>{field.lang}</EuiCode>,
                  painlessLink: (
                    <EuiLink target="_blank" href={getDocLink('scriptedFields.painless')}>
                      <FormattedMessage
                        id="common.ui.fieldEditor.warningLabel.painlessLinkLabel"
                        defaultMessage="Painless"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </span>
          ) : null
        }
      >
        <EuiSelect
          value={field.lang}
          options={scriptingLangs.map(lang => {
            return { value: lang, text: lang };
          })}
          data-test-subj="editorFieldLang"
          onChange={e => {
            this.onLangChange(e.target.value);
          }}
        />
      </EuiFormRow>
    ) : null;
  }

  renderType() {
    const { field, fieldTypes } = this.state;

    return (
      <EuiFormRow
        label={i18n.translate('common.ui.fieldEditor.typeLabel', { defaultMessage: 'Type' })}
      >
        <EuiSelect
          value={field.type}
          disabled={!field.scripted}
          options={fieldTypes.map(type => {
            return { value: type, text: type };
          })}
          data-test-subj="editorFieldType"
          onChange={e => {
            this.onTypeChange(e.target.value);
          }}
        />
      </EuiFormRow>
    );
  }

  /**
   * renders a warning and a table of conflicting indices
   * in case there are indices with different types
   */
  renderTypeConflict() {
    const { field = {} } = this.state;
    if (!field.conflictDescriptions || typeof field.conflictDescriptions !== 'object') {
      return null;
    }

    const columns = [
      {
        field: 'type',
        name: i18n.translate('common.ui.fieldEditor.typeLabel', { defaultMessage: 'Type' }),
        width: '100px',
      },
      {
        field: 'indices',
        name: i18n.translate('common.ui.fieldEditor.indexNameLabel', {
          defaultMessage: 'Index names',
        }),
      },
    ];

    const items = Object.entries(field.conflictDescriptions).map(([type, indices]) => ({
      type,
      indices: Array.isArray(indices) ? indices.join(', ') : 'Index names unavailable',
    }));

    return (
      <div>
        <EuiSpacer size="m" />
        <EuiCallOut
          color="warning"
          iconType="alert"
          title={
            <FormattedMessage
              id="common.ui.fieldEditor.fieldTypeConflict"
              defaultMessage="Field type conflict"
            />
          }
          size="s"
        >
          <FormattedMessage
            id="common.ui.fieldEditor.multiTypeLabelDesc"
            defaultMessage="The type of this field changes across indices. It is unavailable for many analysis functions.
          The indices per type are as follows:"
          />
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiBasicTable items={items} columns={columns} />
        <EuiSpacer size="m" />
      </div>
    );
  }

  renderFormat() {
    const { field, fieldTypeFormats, fieldFormatId, fieldFormatParams } = this.state;
    const { fieldFormatEditors } = this.props.helpers;
    const defaultFormat = fieldTypeFormats[0] && fieldTypeFormats[0].resolvedTitle;
    const label = defaultFormat ? (
      <FormattedMessage
        id="common.ui.fieldEditor.defaultFormatHeader"
        defaultMessage="Format (Default: {defaultFormat})"
        values={{
          defaultFormat: <EuiCode>{defaultFormat}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage id="common.ui.fieldEditor.formatHeader" defaultMessage="Format" />
    );

    return (
      <Fragment>
        <EuiFormRow
          label={label}
          helpText={
            <FormattedMessage
              id="common.ui.fieldEditor.formatLabel"
              defaultMessage="Formatting allows you to control the way that specific values are displayed. It can also cause values to be
              completely changed and prevent highlighting in Discover from working."
            />
          }
        >
          <EuiSelect
            value={fieldFormatId}
            options={fieldTypeFormats.map(format => {
              return { value: format.id || '', text: format.title };
            })}
            data-test-subj="editorSelectedFormatId"
            onChange={e => {
              this.onFormatChange(e.target.value);
            }}
          />
        </EuiFormRow>
        {fieldFormatId ? (
          <FieldFormatEditor
            fieldType={field.type}
            fieldFormat={field.format}
            fieldFormatId={fieldFormatId}
            fieldFormatParams={fieldFormatParams}
            fieldFormatEditors={fieldFormatEditors}
            onChange={this.onFormatParamsChange}
            onError={this.onFormatParamsError}
          />
        ) : null}
      </Fragment>
    );
  }

  renderPopularity() {
    const { field } = this.state;

    return (
      <EuiFormRow
        label={i18n.translate('common.ui.fieldEditor.popularityLabel', {
          defaultMessage: 'Popularity',
          description:
            '"Popularity" refers to Kibana\'s measurement how popular a field is (i.e. how commonly it is used).',
        })}
      >
        <EuiFieldNumber
          value={field.count}
          data-test-subj="editorFieldCount"
          onChange={e => {
            this.onFieldChange('count', e.target.value ? Number(e.target.value) : '');
          }}
        />
      </EuiFormRow>
    );
  }

  onScriptChange = value => {
    this.setState({
      hasScriptError: false,
    });
    this.onFieldChange('script', value);
  };

  renderScript() {
    const { field, hasScriptError } = this.state;
    const isInvalid = !field.script || !field.script.trim() || hasScriptError;
    const errorMsg = hasScriptError ? (
      <span data-test-subj="invalidScriptError">
        <FormattedMessage
          id="common.ui.fieldEditor.scriptInvalidErrorMessage"
          defaultMessage="Script is invalid. View script preview for details"
        />
      </span>
    ) : (
      <FormattedMessage
        id="common.ui.fieldEditor.scriptRequiredErrorMessage"
        defaultMessage="Script is required"
      />
    );

    return field.scripted ? (
      <Fragment>
        <EuiFormRow
          fullWidth
          label={i18n.translate('common.ui.fieldEditor.scriptLabel', { defaultMessage: 'Script' })}
          isInvalid={isInvalid}
          error={isInvalid ? errorMsg : null}
        >
          <EuiCodeEditor
            value={field.script}
            data-test-subj="editorFieldScript"
            onChange={this.onScriptChange}
            mode="groovy"
            width="100%"
            height="300px"
          />
        </EuiFormRow>

        <EuiFormRow>
          <Fragment>
            <EuiText>
              <FormattedMessage
                id="common.ui.fieldEditor.script.accessWithLabel"
                defaultMessage="Access fields with {code}."
                values={{ code: <code>{`doc['some_field'].value`}</code> }}
              />
            </EuiText>
            <br />
            <EuiLink onClick={this.showScriptingHelp} data-test-subj="scriptedFieldsHelpLink">
              <FormattedMessage
                id="common.ui.fieldEditor.script.getHelpLabel"
                defaultMessage="Get help with the syntax and preview the results of your script."
              />
            </EuiLink>
          </Fragment>
        </EuiFormRow>
      </Fragment>
    ) : null;
  }

  showScriptingHelp = () => {
    this.setState({
      showScriptingHelp: true,
    });
  };

  hideScriptingHelp = () => {
    this.setState({
      showScriptingHelp: false,
    });
  };

  renderDeleteModal = () => {
    const { field } = this.state;

    return this.state.showDeleteModal ? (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={i18n.translate('common.ui.fieldEditor.deleteFieldHeader', {
            defaultMessage: "Delete field '{fieldName}'",
            values: { fieldName: field.name },
          })}
          onCancel={this.hideDeleteModal}
          onConfirm={() => {
            this.hideDeleteModal();
            this.deleteField();
          }}
          cancelButtonText={i18n.translate('common.ui.fieldEditor.deleteField.cancelButton', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('common.ui.fieldEditor.deleteField.deleteButton', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>
            <FormattedMessage
              id="common.ui.fieldEditor.deleteFieldLabel"
              defaultMessage="You can't recover a deleted field.{separator}Are you sure you want to do this?"
              values={{
                separator: (
                  <span>
                    <br />
                    <br />
                  </span>
                ),
              }}
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    ) : null;
  };

  showDeleteModal = () => {
    this.setState({
      showDeleteModal: true,
    });
  };

  hideDeleteModal = () => {
    this.setState({
      showDeleteModal: false,
    });
  };

  renderActions() {
    const { isCreating, field, isSaving } = this.state;
    const { redirectAway } = this.props.helpers;

    return (
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={this.saveField}
              isDisabled={this.isSavingDisabled()}
              isLoading={isSaving}
              data-test-subj="fieldSaveButton"
            >
              {isCreating ? (
                <FormattedMessage
                  id="common.ui.fieldEditor.actions.createButton"
                  defaultMessage="Create field"
                />
              ) : (
                <FormattedMessage
                  id="common.ui.fieldEditor.actions.saveButton"
                  defaultMessage="Save field"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={redirectAway} data-test-subj="fieldCancelButton">
              <FormattedMessage
                id="common.ui.fieldEditor.actions.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          {!isCreating && field.scripted ? (
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="danger" onClick={this.showDeleteModal}>
                    <FormattedMessage
                      id="common.ui.fieldEditor.actions.deleteButton"
                      defaultMessage="Delete"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }

  renderScriptingPanels = () => {
    const { scriptingLangs, field, showScriptingHelp } = this.state;

    if (!field.scripted) {
      return;
    }

    return (
      <Fragment>
        <ScriptingDisabledCallOut isVisible={!scriptingLangs.length} />
        <ScriptingWarningCallOut isVisible />
        <ScriptingHelpFlyout
          isVisible={showScriptingHelp}
          onClose={this.hideScriptingHelp}
          indexPattern={this.props.indexPattern}
          lang={field.lang}
          name={field.name}
          script={field.script}
          executeScript={executeScript}
        />
      </Fragment>
    );
  };

  deleteField = () => {
    const { redirectAway } = this.props.helpers;
    const { indexPattern } = this.props;
    const { field } = this.state;
    const remove = indexPattern.removeScriptedField(field);

    if (remove) {
      remove.then(() => {
        const message = i18n.translate('common.ui.fieldEditor.deleteField.deletedHeader', {
          defaultMessage: "Deleted '{fieldName}'",
          values: { fieldName: field.name },
        });
        toastNotifications.addSuccess(message);
        redirectAway();
      });
    } else {
      redirectAway();
    }
  };

  saveField = async () => {
    const field = this.state.field.toActualField();
    const { indexPattern } = this.props;
    const { fieldFormatId } = this.state;

    if (field.scripted) {
      this.setState({
        isSaving: true,
      });

      const isValid = await isScriptValid({
        name: field.name,
        lang: field.lang,
        script: field.script,
        indexPatternTitle: indexPattern.title,
      });

      if (!isValid) {
        this.setState({
          hasScriptError: true,
          isSaving: false,
        });
        return;
      }
    }

    const { redirectAway } = this.props.helpers;
    const index = indexPattern.fields.findIndex(f => f.name === field.name);

    if (index > -1) {
      indexPattern.fields.update(field);
    } else {
      indexPattern.fields.add(field);
    }

    if (!fieldFormatId) {
      indexPattern.fieldFormatMap[field.name] = undefined;
    } else {
      indexPattern.fieldFormatMap[field.name] = field.format;
    }

    return indexPattern.save().then(function() {
      const message = i18n.translate('common.ui.fieldEditor.deleteField.savedHeader', {
        defaultMessage: "Saved '{fieldName}'",
        values: { fieldName: field.name },
      });
      toastNotifications.addSuccess(message);
      redirectAway();
    });
  };

  isSavingDisabled() {
    const { field, hasFormatError, hasScriptError } = this.state;

    if (
      hasFormatError ||
      hasScriptError ||
      !field.name ||
      !field.name.trim() ||
      (field.scripted && (!field.script || !field.script.trim()))
    ) {
      return true;
    }

    return false;
  }

  render() {
    const { isReady, isCreating, field } = this.state;

    return isReady ? (
      <div>
        <EuiText>
          <h3>
            {isCreating ? (
              <FormattedMessage
                id="common.ui.fieldEditor.createHeader"
                defaultMessage="Create scripted field"
              />
            ) : (
              <FormattedMessage
                id="common.ui.fieldEditor.editHeader"
                defaultMessage="Edit {fieldName}"
                values={{ fieldName: field.name }}
              />
            )}
          </h3>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm>
          {this.renderScriptingPanels()}
          {this.renderName()}
          {this.renderLanguage()}
          {this.renderType()}
          {this.renderTypeConflict()}
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
