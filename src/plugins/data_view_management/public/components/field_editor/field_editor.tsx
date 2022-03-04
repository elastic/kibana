/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { PureComponent, Fragment } from 'react';
import { intersection, union, get } from 'lodash';

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
  EuiSelect,
  EuiSpacer,
  EuiText,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PainlessLang } from '@kbn/monaco';
import type { FieldFormatInstanceType } from 'src/plugins/field_formats/common';
import type { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { KBN_FIELD_TYPES, ES_FIELD_TYPES } from '@kbn/field-types';
import {
  getEnabledScriptingLanguages,
  getDeprecatedScriptingLanguages,
  getSupportedScriptingLanguages,
} from '../../scripting_languages';
import {
  DataView,
  DataViewField,
  DataViewsPublicPluginStart,
} from '../../../../../plugins/data_views/public';
import { context as contextType, CodeEditor } from '../../../../kibana_react/public';
import {
  ScriptingDisabledCallOut,
  ScriptingWarningCallOut,
} from './components/scripting_call_outs';

import { ScriptingHelpFlyout } from './components/scripting_help';
import { FieldFormatEditor } from './components/field_format_editor';
import { IndexPatternManagmentContextValue } from '../../types';

import { FIELD_TYPES_BY_LANG, DEFAULT_FIELD_TYPES } from './constants';
import { executeScript, isScriptValid } from './lib';

const getFieldTypeFormatsList = (
  field: DataViewField['spec'],
  defaultFieldFormat: FieldFormatInstanceType,
  fieldFormats: FieldFormatsStart
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

export interface FieldEditorState {
  isReady: boolean;
  isCreating: boolean;
  isDeprecatedLang: boolean;
  scriptingLangs: estypes.ScriptLanguage[];
  fieldTypes: string[];
  fieldTypeFormats: FieldTypeFormat[];
  existingFieldNames: string[];
  fieldFormatId?: string;
  fieldFormatParams: { [key: string]: unknown };
  showScriptingHelp: boolean;
  showDeleteModal: boolean;
  hasFormatError: boolean;
  hasScriptError: boolean;
  isSaving: boolean;
  errors?: string[];
  format: any;
  spec: DataViewField['spec'];
  customLabel: string;
}

export interface FieldEdiorProps {
  indexPattern: DataView;
  spec: DataViewField['spec'];
  services: {
    redirectAway: () => void;
    indexPatternService: DataViewsPublicPluginStart;
  };
}

export class FieldEditor extends PureComponent<FieldEdiorProps, FieldEditorState> {
  static contextType = contextType;

  public declare readonly context: IndexPatternManagmentContextValue;

  supportedLangs: estypes.ScriptLanguage[] = [];
  deprecatedLangs: estypes.ScriptLanguage[] = [];
  constructor(props: FieldEdiorProps, context: IndexPatternManagmentContextValue) {
    super(props, context);

    const { spec, indexPattern } = props;

    this.state = {
      isReady: false,
      isCreating: false,
      isDeprecatedLang: false,
      scriptingLangs: [],
      fieldTypes: [],
      fieldTypeFormats: [],
      existingFieldNames: indexPattern.fields.getAll().map((f: DataViewField) => f.name),
      fieldFormatId: undefined,
      fieldFormatParams: {},
      showScriptingHelp: false,
      showDeleteModal: false,
      hasFormatError: false,
      hasScriptError: false,
      isSaving: false,
      format: props.indexPattern.getFormatterForField(spec),
      spec: { ...spec },
      customLabel: '',
    };
    this.supportedLangs = getSupportedScriptingLanguages();
    this.deprecatedLangs = getDeprecatedScriptingLanguages();
    this.init(context);
  }

  async init(context: IndexPatternManagmentContextValue) {
    const { http, notifications, fieldFormats } = context.services;
    const { format, spec } = this.state;
    const { indexPattern } = this.props;

    const enabledLangs = await getEnabledScriptingLanguages(http, notifications.toasts);
    const scriptingLangs = intersection(
      enabledLangs,
      union(this.supportedLangs, this.deprecatedLangs)
    );

    spec.lang = spec.lang && scriptingLangs.includes(spec.lang) ? spec.lang : undefined;
    if (spec.scripted && !spec.lang) {
      spec.lang = scriptingLangs[0];
    }

    const fieldTypes = get(FIELD_TYPES_BY_LANG, spec.lang || '', DEFAULT_FIELD_TYPES);
    spec.type = fieldTypes.includes(spec.type) ? spec.type : fieldTypes[0];

    const DefaultFieldFormat = fieldFormats.getDefaultType(
      spec.type as KBN_FIELD_TYPES,
      spec.esTypes as ES_FIELD_TYPES[]
    );

    this.setState({
      isReady: true,
      isCreating: !indexPattern.fields.getByName(spec.name),
      isDeprecatedLang: this.deprecatedLangs.includes(spec.lang || ''),
      errors: [],
      scriptingLangs,
      fieldTypes,
      fieldTypeFormats: getFieldTypeFormatsList(
        spec,
        DefaultFieldFormat as FieldFormatInstanceType,
        fieldFormats
      ),
      fieldFormatId: indexPattern.getFormatterForFieldNoDefault(spec.name)?.type?.id,
      customLabel: spec.customLabel || '',
      fieldFormatParams: format.params(),
    });
  }

  onFieldChange = (fieldName: string, value: string | number) => {
    const { spec } = this.state;
    (spec as any)[fieldName] = value;
    this.forceUpdate();
  };

  onTypeChange = (type: KBN_FIELD_TYPES) => {
    const { fieldFormats } = this.context.services;
    const { spec, format } = this.state;
    const DefaultFieldFormat = fieldFormats.getDefaultType(type) as FieldFormatInstanceType;

    spec.type = type;

    this.setState({
      fieldTypeFormats: getFieldTypeFormatsList(spec, DefaultFieldFormat, fieldFormats),
      fieldFormatId: DefaultFieldFormat.id,
      fieldFormatParams: format.params(),
    });
  };

  onLangChange = (lang: estypes.ScriptLanguage) => {
    const { spec } = this.state;
    const fieldTypes = get(FIELD_TYPES_BY_LANG, lang, DEFAULT_FIELD_TYPES);
    spec.lang = lang;
    spec.type = fieldTypes.includes(spec.type) ? spec.type : fieldTypes[0];

    this.setState({
      fieldTypes,
    });
  };

  onFormatChange = (formatId: string, params?: any) => {
    const { fieldTypeFormats } = this.state;
    const { uiSettings, fieldFormats } = this.context.services;

    const FieldFormat = fieldFormats.getType(
      formatId || (fieldTypeFormats[0] as InitialFieldTypeFormat).defaultFieldFormat.id
    ) as FieldFormatInstanceType;

    const newFormat = new FieldFormat(params, (key) => uiSettings.get(key));

    this.setState({
      fieldFormatId: formatId,
      fieldFormatParams: params,
      format: newFormat,
    });
  };

  onFormatParamsChange = (newParams: { [key: string]: any }) => {
    const { fieldFormatId } = this.state;
    this.onFormatChange(fieldFormatId as string, newParams);
  };

  onFormatParamsError = (error?: string) => {
    this.setState({
      hasFormatError: !!error,
    });
  };

  isDuplicateName() {
    const { isCreating, spec, existingFieldNames } = this.state;
    return isCreating && existingFieldNames.includes(spec.name);
  }

  renderName() {
    const { isCreating, spec } = this.state;
    const starCheck = spec?.name?.includes('*');
    const isInvalid = !spec.name || !spec.name.trim() || starCheck;

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
                  fieldName: <EuiCode>{spec.name}</EuiCode>,
                }}
              />
            </span>
          ) : null
        }
        isInvalid={isInvalid}
        error={
          isInvalid &&
          (starCheck
            ? i18n.translate(
                'indexPatternManagement.starCharacterNotAllowedValidationErrorMessage',
                {
                  defaultMessage: 'The field cannot have * in the name.',
                }
              )
            : i18n.translate('indexPatternManagement.nameErrorMessage', {
                defaultMessage: 'Name is required',
              }))
        }
      >
        <EuiFieldText
          value={spec.name || ''}
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
    const { spec, scriptingLangs, isDeprecatedLang } = this.state;

    return spec.scripted ? (
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
                  language: <EuiCode>{spec.lang}</EuiCode>,
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
          value={spec.lang}
          options={scriptingLangs.map((lang) => {
            return { value: lang, text: lang };
          })}
          data-test-subj="editorFieldLang"
          onChange={(e) => {
            this.onLangChange(e.target.value as estypes.ScriptLanguage);
          }}
        />
      </EuiFormRow>
    ) : null;
  }

  renderType() {
    const { spec, fieldTypes } = this.state;

    return (
      <EuiFormRow
        label={i18n.translate('indexPatternManagement.typeLabel', { defaultMessage: 'Type' })}
      >
        <EuiSelect
          value={spec.type}
          disabled={!spec.scripted}
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

  renderCustomLabel() {
    const { customLabel, spec } = this.state;

    return (
      <EuiFormRow
        label={i18n.translate('indexPatternManagement.customLabel', {
          defaultMessage: 'Custom label',
        })}
        helpText={
          <FormattedMessage
            id="indexPatternManagement.labelHelpText"
            defaultMessage="Set a custom label to use when this field is displayed in Discover, Maps, and Visualize. Queries and filters don't currently support a custom label and will use the original field name."
          />
        }
      >
        <EuiFieldText
          value={customLabel || ''}
          placeholder={spec.name}
          data-test-subj="editorFieldCustomLabel"
          onChange={(e) => {
            this.setState({ customLabel: e.target.value });
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
    const { spec } = this.state;
    if (!spec.conflictDescriptions || typeof spec.conflictDescriptions !== 'object') {
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

    const items = Object.entries(spec.conflictDescriptions).map(([type, indices]) => ({
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
    const { spec, fieldTypeFormats, fieldFormatId, fieldFormatParams, format } = this.state;
    const { fieldFormatEditors } = this.context.services;
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
              defaultMessage="Formatting controls how values are displayed. Changing this setting might also affect the field value and highlighting in Discover."
            />
          }
        >
          <EuiSelect
            value={fieldFormatId}
            options={fieldTypeFormats.map((fmt) => {
              return { value: fmt.id || '', text: fmt.title };
            })}
            data-test-subj="editorSelectedFormatId"
            onChange={(e) => {
              this.onFormatChange(e.target.value);
            }}
          />
        </EuiFormRow>
        {fieldFormatId ? (
          <FieldFormatEditor
            fieldType={spec.type}
            fieldFormat={format}
            fieldFormatId={fieldFormatId}
            fieldFormatParams={fieldFormatParams || {}}
            fieldFormatEditors={fieldFormatEditors}
            onChange={this.onFormatParamsChange}
            onError={this.onFormatParamsError}
          />
        ) : null}
      </Fragment>
    );
  }

  renderPopularity() {
    const { spec } = this.state;

    return (
      <EuiFormRow
        label={i18n.translate('indexPatternManagement.popularityLabel', {
          defaultMessage: 'Popularity',
          description:
            '"Popularity" refers to Kibana\'s measurement how popular a field is (i.e. how commonly it is used).',
        })}
      >
        <EuiFieldNumber
          value={spec.count}
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
    const { spec, hasScriptError } = this.state;
    const isInvalid = !spec.script || !spec.script.trim() || hasScriptError;
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

    return spec.scripted ? (
      <Fragment>
        <EuiFormRow
          fullWidth
          label={i18n.translate('indexPatternManagement.scriptLabel', { defaultMessage: 'Script' })}
          isInvalid={isInvalid}
          error={isInvalid ? errorMsg : null}
        >
          <CodeEditor
            languageId={PainlessLang.ID}
            width="100%"
            height="300px"
            value={spec.script ?? ''}
            onChange={this.onScriptChange}
            data-test-subj="editorFieldScript"
            aria-label={i18n.translate('indexPatternManagement.scriptLabelAriaLabel', {
              defaultMessage: 'Script editor',
            })}
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
    const { spec } = this.state;

    return this.state.showDeleteModal ? (
      <EuiConfirmModal
        title={i18n.translate('indexPatternManagement.deleteFieldHeader', {
          defaultMessage: "Delete field '{fieldName}'",
          values: { fieldName: spec.name },
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
    const { isCreating, spec, isSaving } = this.state;
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
          {!isCreating && spec.scripted ? (
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
    const { scriptingLangs, spec, showScriptingHelp } = this.state;

    if (!spec.scripted) {
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
          lang={spec.lang as string}
          name={spec.name}
          script={spec.script}
          executeScript={executeScript}
        />
      </Fragment>
    );
  };

  deleteField = () => {
    const { redirectAway, indexPatternService } = this.props.services;
    const { indexPattern } = this.props;
    const { spec } = this.state;
    indexPattern.removeScriptedField(spec.name);
    indexPatternService.updateSavedObject(indexPattern).then(() => {
      const message = i18n.translate('indexPatternManagement.deleteField.deletedHeader', {
        defaultMessage: "Deleted '{fieldName}'",
        values: { fieldName: spec.name },
      });
      this.context.services.notifications.toasts.addSuccess(message);
      redirectAway();
    });
  };

  saveField = async () => {
    const field = this.state.spec;
    const { indexPattern } = this.props;
    const { fieldFormatId, fieldFormatParams, customLabel } = this.state;

    if (field.scripted) {
      this.setState({
        isSaving: true,
      });

      const isValid = await isScriptValid({
        name: field.name,
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

    const { redirectAway, indexPatternService } = this.props.services;
    const fieldExists = !!indexPattern.fields.getByName(field.name);

    let oldField: DataViewField['spec'];

    if (fieldExists) {
      oldField = indexPattern.fields.getByName(field.name)!.spec;
      indexPattern.fields.update(field);
    } else {
      indexPattern.fields.add(field);
    }

    if (fieldFormatId) {
      indexPattern.setFieldFormat(field.name, { id: fieldFormatId, params: fieldFormatParams });
    } else {
      indexPattern.deleteFieldFormat(field.name);
    }

    if (field.customLabel !== customLabel) {
      field.customLabel = customLabel;
      indexPattern.fields.update(field);
    }

    return indexPatternService
      .updateSavedObject(indexPattern)
      .then(() => {
        const message = i18n.translate('indexPatternManagement.deleteField.savedHeader', {
          defaultMessage: "Saved '{fieldName}'",
          values: { fieldName: field.name },
        });
        this.context.services.notifications.toasts.addSuccess(message);
        redirectAway();
      })
      .catch(() => {
        if (oldField) {
          indexPattern.fields.update(oldField);
        } else {
          indexPattern.fields.remove(field);
        }
      });
  };

  isSavingDisabled() {
    const { spec, hasFormatError, hasScriptError } = this.state;

    if (
      hasFormatError ||
      hasScriptError ||
      !spec.name ||
      !spec.name.trim() ||
      (spec.scripted && (!spec.script || !spec.script.trim()))
    ) {
      return true;
    }

    return false;
  }

  render() {
    const { isReady, isCreating, spec } = this.state;

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
                values={{ fieldName: spec.name }}
              />
            )}
          </h3>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm>
          {this.renderScriptingPanels()}
          {this.renderName()}
          {this.renderCustomLabel()}
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
