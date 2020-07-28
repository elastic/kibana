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
import { intersection, union, get } from 'lodash';

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

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  getEnabledScriptingLanguages,
  getDeprecatedScriptingLanguages,
  getSupportedScriptingLanguages,
} from '../../scripting_languages';
import {
  IndexPatternField,
  FieldFormatInstanceType,
  IndexPattern,
  IFieldType,
  KBN_FIELD_TYPES,
  ES_FIELD_TYPES,
  DataPublicPluginStart,
} from '../../../../../plugins/data/public';
import { context as contextType } from '../../../../kibana_react/public';
import {
  ScriptingDisabledCallOut,
  ScriptingWarningCallOut,
} from './components/scripting_call_outs';

import { ScriptingHelpFlyout } from './components/scripting_help';
import { FieldFormatEditor } from './components/field_format_editor';
import { IndexPatternManagmentContextValue } from '../../types';

import { FIELD_TYPES_BY_LANG, DEFAULT_FIELD_TYPES } from './constants';
import { executeScript, isScriptValid } from './lib';

// This loads Ace editor's "groovy" mode, used below to highlight the script.
import 'brace/mode/groovy';

const getFieldTypeFormatsList = (
  field: IFieldType,
  defaultFieldFormat: FieldFormatInstanceType,
  fieldFormats: DataPublicPluginStart['fieldFormats']
) => {
  const formatsByType = fieldFormats
    .getByFieldType(field.type as KBN_FIELD_TYPES)
    .map(({ id, title }) => ({
      id,
      title,
    }));

  return [
    {
      id: '',
      defaultFieldFormat,
      title: i18n.translate('indexPatternManagement.defaultFormatDropDown', {
        defaultMessage: '- Default -',
      }),
    },
    ...formatsByType,
  ];
};

interface FieldTypeFormat {
  id: string;
  title: string;
}

interface InitialFieldTypeFormat extends FieldTypeFormat {
  defaultFieldFormat: FieldFormatInstanceType;
}

interface FieldClone extends IndexPatternField {
  format: any;
}

export interface FieldEditorState {
  isReady: boolean;
  isCreating: boolean;
  isDeprecatedLang: boolean;
  scriptingLangs: string[];
  fieldTypes: string[];
  fieldTypeFormats: FieldTypeFormat[];
  existingFieldNames: string[];
  field: FieldClone;
  fieldFormatId?: string;
  fieldFormatParams: { [key: string]: unknown };
  showScriptingHelp: boolean;
  showDeleteModal: boolean;
  hasFormatError: boolean;
  hasScriptError: boolean;
  isSaving: boolean;
  errors?: string[];
}

export interface FieldEdiorProps {
  indexPattern: IndexPattern;
  field: IndexPatternField;
  services: {
    redirectAway: () => void;
  };
}

export class FieldEditor extends PureComponent<FieldEdiorProps, FieldEditorState> {
  static contextType = contextType;

  public readonly context!: IndexPatternManagmentContextValue;

  supportedLangs: string[] = [];
  deprecatedLangs: string[] = [];
  constructor(props: FieldEdiorProps, context: IndexPatternManagmentContextValue) {
    super(props, context);

    const { field, indexPattern } = props;

    this.state = {
      isReady: false,
      isCreating: false,
      isDeprecatedLang: false,
      scriptingLangs: [],
      fieldTypes: [],
      fieldTypeFormats: [],
      existingFieldNames: indexPattern.fields.map((f: IFieldType) => f.name),
      field: { ...field, format: field.format },
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
    this.init(context);
  }

  async init(context: IndexPatternManagmentContextValue) {
    const { http, notifications, data } = context.services;
    const { field } = this.state;
    const { indexPattern } = this.props;

    const enabledLangs = await getEnabledScriptingLanguages(http, notifications.toasts);
    const scriptingLangs = intersection(
      enabledLangs,
      union(this.supportedLangs, this.deprecatedLangs)
    );
    field.lang = field.lang && scriptingLangs.includes(field.lang) ? field.lang : undefined;

    const fieldTypes = get(FIELD_TYPES_BY_LANG, field.lang || '', DEFAULT_FIELD_TYPES);
    field.type = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];

    const DefaultFieldFormat = data.fieldFormats.getDefaultType(
      field.type as KBN_FIELD_TYPES,
      field.esTypes as ES_FIELD_TYPES[]
    );

    this.setState({
      isReady: true,
      isCreating: !indexPattern.fields.find((f) => f.name === field.name),
      isDeprecatedLang: this.deprecatedLangs.includes(field.lang || ''),
      errors: [],
      scriptingLangs,
      fieldTypes,
      fieldTypeFormats: getFieldTypeFormatsList(
        field,
        DefaultFieldFormat as FieldFormatInstanceType,
        data.fieldFormats
      ),
      fieldFormatId: get(indexPattern, ['fieldFormatMap', field.name, 'type', 'id']),
      fieldFormatParams: field.format.params(),
    });
  }

  onFieldChange = (fieldName: string, value: string | number) => {
    const { field } = this.state;
    (field as any)[fieldName] = value;
    this.forceUpdate();
  };

  onTypeChange = (type: KBN_FIELD_TYPES) => {
    const { uiSettings, data } = this.context.services;
    const { field } = this.state;
    const DefaultFieldFormat = data.fieldFormats.getDefaultType(type) as FieldFormatInstanceType;

    field.type = type;

    field.format = new DefaultFieldFormat(null, (key) => uiSettings.get(key));

    this.setState({
      fieldTypeFormats: getFieldTypeFormatsList(field, DefaultFieldFormat, data.fieldFormats),
      fieldFormatId: DefaultFieldFormat.id,
      fieldFormatParams: field.format.params(),
    });
  };

  onLangChange = (lang: string) => {
    const { field } = this.state;
    const fieldTypes = get(FIELD_TYPES_BY_LANG, lang, DEFAULT_FIELD_TYPES);
    field.lang = lang;
    field.type = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];

    this.setState({
      fieldTypes,
    });
  };

  onFormatChange = (formatId: string, params?: any) => {
    const { field, fieldTypeFormats } = this.state;
    const { uiSettings, data } = this.context.services;

    const FieldFormat = data.fieldFormats.getType(
      formatId || (fieldTypeFormats[0] as InitialFieldTypeFormat).defaultFieldFormat.id
    ) as FieldFormatInstanceType;

    field.format = new FieldFormat(params, (key) => uiSettings.get(key));

    this.setState({
      fieldFormatId: FieldFormat.id,
      fieldFormatParams: field.format.params(),
    });
  };

  onFormatParamsChange = (newParams: { fieldType: string; [key: string]: any }) => {
    const { fieldFormatId } = this.state;
    this.onFormatChange(fieldFormatId as string, newParams);
  };

  onFormatParamsError = (error?: string) => {
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
        label={i18n.translate('indexPatternManagement.nameLabel', { defaultMessage: 'Name' })}
        helpText={
          this.isDuplicateName() ? (
            <span>
              <EuiIcon type="alert" color="warning" size="s" />
              &nbsp;
              <FormattedMessage
                id="indexPatternManagement.mappingConflictLabel.mappingConflictDetail"
                defaultMessage="{mappingConflict} You already have a field with the name {fieldName}. Naming your scripted field with
              the same name means you won't be able to query both fields at the same time."
                values={{
                  mappingConflict: (
                    <strong>
                      <FormattedMessage
                        id="indexPatternManagement.mappingConflictLabel.mappingConflictLabel"
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
            ? i18n.translate('indexPatternManagement.nameErrorMessage', {
                defaultMessage: 'Name is required',
              })
            : null
        }
      >
        <EuiFieldText
          value={field.name || ''}
          placeholder={i18n.translate('indexPatternManagement.namePlaceholder', {
            defaultMessage: 'New scripted field',
          })}
          data-test-subj="editorFieldName"
          onChange={(e) => {
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
        label={i18n.translate('indexPatternManagement.languageLabel', {
          defaultMessage: 'Language',
        })}
        helpText={
          isDeprecatedLang ? (
            <span>
              <EuiIcon type="alert" color="warning" size="s" />
              &nbsp;
              <strong>
                <FormattedMessage
                  id="indexPatternManagement.warningHeader"
                  defaultMessage="Deprecation Warning:"
                />
              </strong>
              &nbsp;
              <FormattedMessage
                id="indexPatternManagement.warningLabel.warningDetail"
                defaultMessage="{language} is deprecated and support will be removed in the next major version of Kibana and Elasticsearch.
              We recommend using {painlessLink} for new scripted fields."
                values={{
                  language: <EuiCode>{field.lang}</EuiCode>,
                  painlessLink: (
                    <EuiLink
                      target="_blank"
                      href={this.context.services.docLinks.links.scriptedFields.painless}
                    >
                      <FormattedMessage
                        id="indexPatternManagement.warningLabel.painlessLinkLabel"
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
          options={scriptingLangs.map((lang) => {
            return { value: lang, text: lang };
          })}
          data-test-subj="editorFieldLang"
          onChange={(e) => {
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
        label={i18n.translate('indexPatternManagement.typeLabel', { defaultMessage: 'Type' })}
      >
        <EuiSelect
          value={field.type}
          disabled={!field.scripted}
          options={fieldTypes.map((type) => {
            return { value: type, text: type };
          })}
          data-test-subj="editorFieldType"
          onChange={(e) => {
            this.onTypeChange(e.target.value as KBN_FIELD_TYPES);
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
    const { field } = this.state;
    if (!field.conflictDescriptions || typeof field.conflictDescriptions !== 'object') {
      return null;
    }

    const columns = [
      {
        field: 'type',
        name: i18n.translate('indexPatternManagement.typeLabel', { defaultMessage: 'Type' }),
        width: '100px',
      },
      {
        field: 'indices',
        name: i18n.translate('indexPatternManagement.indexNameLabel', {
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
              id="indexPatternManagement.fieldTypeConflict"
              defaultMessage="Field type conflict"
            />
          }
          size="s"
        >
          <FormattedMessage
            id="indexPatternManagement.multiTypeLabelDesc"
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
    const { indexPatternManagementStart } = this.context.services;
    const defaultFormat = (fieldTypeFormats[0] as InitialFieldTypeFormat).defaultFieldFormat.title;

    const label = defaultFormat ? (
      <FormattedMessage
        id="indexPatternManagement.defaultFormatHeader"
        defaultMessage="Format (Default: {defaultFormat})"
        values={{
          defaultFormat: <EuiCode>{defaultFormat}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage id="indexPatternManagement.formatHeader" defaultMessage="Format" />
    );

    return (
      <Fragment>
        <EuiFormRow
          label={label}
          helpText={
            <FormattedMessage
              id="indexPatternManagement.formatLabel"
              defaultMessage="Formatting allows you to control the way that specific values are displayed. It can also cause values to be
              completely changed and prevent highlighting in Discover from working."
            />
          }
        >
          <EuiSelect
            value={fieldFormatId}
            options={fieldTypeFormats.map((format) => {
              return { value: format.id || '', text: format.title };
            })}
            data-test-subj="editorSelectedFormatId"
            onChange={(e) => {
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
            fieldFormatEditors={indexPatternManagementStart.fieldFormatEditors}
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
        label={i18n.translate('indexPatternManagement.popularityLabel', {
          defaultMessage: 'Popularity',
          description:
            '"Popularity" refers to Kibana\'s measurement how popular a field is (i.e. how commonly it is used).',
        })}
      >
        <EuiFieldNumber
          value={field.count}
          data-test-subj="editorFieldCount"
          onChange={(e) => {
            this.onFieldChange('count', e.target.value ? Number(e.target.value) : '');
          }}
        />
      </EuiFormRow>
    );
  }

  onScriptChange = (value: string) => {
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
          id="indexPatternManagement.scriptInvalidErrorMessage"
          defaultMessage="Script is invalid. View script preview for details"
        />
      </span>
    ) : (
      <FormattedMessage
        id="indexPatternManagement.scriptRequiredErrorMessage"
        defaultMessage="Script is required"
      />
    );

    return field.scripted ? (
      <Fragment>
        <EuiFormRow
          fullWidth
          label={i18n.translate('indexPatternManagement.scriptLabel', { defaultMessage: 'Script' })}
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
                id="indexPatternManagement.script.accessWithLabel"
                defaultMessage="Access fields with {code}."
                values={{ code: <code>{`doc['some_field'].value`}</code> }}
              />
            </EuiText>
            <br />
            <EuiLink onClick={this.showScriptingHelp} data-test-subj="scriptedFieldsHelpLink">
              <FormattedMessage
                id="indexPatternManagement.script.getHelpLabel"
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
          title={i18n.translate('indexPatternManagement.deleteFieldHeader', {
            defaultMessage: "Delete field '{fieldName}'",
            values: { fieldName: field.name },
          })}
          onCancel={this.hideDeleteModal}
          onConfirm={() => {
            this.hideDeleteModal();
            this.deleteField();
          }}
          cancelButtonText={i18n.translate('indexPatternManagement.deleteField.cancelButton', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('indexPatternManagement.deleteField.deleteButton', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>
            <FormattedMessage
              id="indexPatternManagement.deleteFieldLabel"
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
    const { redirectAway } = this.props.services;

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
                  id="indexPatternManagement.actions.createButton"
                  defaultMessage="Create field"
                />
              ) : (
                <FormattedMessage
                  id="indexPatternManagement.actions.saveButton"
                  defaultMessage="Save field"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={redirectAway} data-test-subj="fieldCancelButton">
              <FormattedMessage
                id="indexPatternManagement.actions.cancelButton"
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
                      id="indexPatternManagement.actions.deleteButton"
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
          lang={field.lang as string}
          name={field.name}
          script={field.script}
          executeScript={executeScript}
        />
      </Fragment>
    );
  };

  deleteField = () => {
    const { redirectAway } = this.props.services;
    const { indexPattern } = this.props;
    const { field } = this.state;
    const remove = indexPattern.removeScriptedField(field);

    if (remove) {
      remove.then(() => {
        const message = i18n.translate('indexPatternManagement.deleteField.deletedHeader', {
          defaultMessage: "Deleted '{fieldName}'",
          values: { fieldName: field.name },
        });
        this.context.services.notifications.toasts.addSuccess(message);
        redirectAway();
      });
    } else {
      redirectAway();
    }
  };

  saveField = async () => {
    const field = this.state.field;
    const { indexPattern } = this.props;
    const { fieldFormatId } = this.state;

    if (field.scripted) {
      this.setState({
        isSaving: true,
      });

      const isValid = await isScriptValid({
        name: field.name,
        lang: field.lang as string,
        script: field.script as string,
        indexPatternTitle: indexPattern.title,
        http: this.context.services.http,
      });

      if (!isValid) {
        this.setState({
          hasScriptError: true,
          isSaving: false,
        });
        return;
      }
    }

    const { redirectAway } = this.props.services;
    const index = indexPattern.fields.findIndex((f: IFieldType) => f.name === field.name);

    let oldField: IFieldType | undefined;

    if (index > -1) {
      oldField = indexPattern.fields.getByName(field.name);
      indexPattern.fields.update(field);
    } else {
      indexPattern.fields.add(field);
    }

    if (!fieldFormatId) {
      indexPattern.fieldFormatMap[field.name] = undefined;
    } else {
      indexPattern.fieldFormatMap[field.name] = field.format;
    }

    return indexPattern
      .save()
      .then(() => {
        const message = i18n.translate('indexPatternManagement.deleteField.savedHeader', {
          defaultMessage: "Saved '{fieldName}'",
          values: { fieldName: field.name },
        });
        this.context.services.notifications.toasts.addSuccess(message);
        redirectAway();
      })
      .catch((error) => {
        if (oldField) {
          indexPattern.fields.update(oldField);
        } else {
          indexPattern.fields.remove(field);
        }
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
                id="indexPatternManagement.createHeader"
                defaultMessage="Create scripted field"
              />
            ) : (
              <FormattedMessage
                id="indexPatternManagement.editHeader"
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
