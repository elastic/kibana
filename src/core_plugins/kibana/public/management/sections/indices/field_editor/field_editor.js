import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { intersection, union, get } from 'lodash';

import {
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
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
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
  EuiTextArea,
} from '@elastic/eui';

import {
  ScriptingDisabledCallOut,
  ScriptingHelpCallOut,
} from './components/scripting_call_outs';

import {
  FieldFormatEditor
} from './components/field_format_editor';

import { FIELD_TYPES_BY_LANG, DEFAULT_FIELD_TYPES } from './constants';
import { copyField, getDefaultFormat } from './lib';

export class FieldEditor extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    field: PropTypes.object.isRequired,
    helpers: PropTypes.shape({
      Field: PropTypes.func.isRequired,
      getConfig: PropTypes.func.isRequired,
      getEnabledScriptingLanguages: PropTypes.func.isRequired,
      fieldFormatEditors: PropTypes.object.isRequired,
    }),
  };

  constructor(props) {
    super(props);
    this.state = {
      isReady: false,
      isCreating: false,
      isDeprecatedLang: false,
      scriptingLangs: [],
      fieldTypes: [],
      fieldTypeFormats: [],
      existingFieldNames: props.indexPattern.fields.map(field => field.name),
      field: copyField(props.field, props.indexPattern, props.helpers.Field),
      fieldFormatId: undefined,
      fieldFormatParams: {},
    };
    this.supportedLangs = getSupportedScriptingLanguages();
    this.deprecatedLangs = getDeprecatedScriptingLanguages();
    this.init();
  }

  async init() {
    const { getEnabledScriptingLanguages } = this.props.helpers;
    const { field } = this.state;
    const { indexPattern } = this.props;

    const enabledLangs = await getEnabledScriptingLanguages();
    const scriptingLangs = intersection(enabledLangs, union(this.supportedLangs, this.deprecatedLangs));
    field.lang = scriptingLangs.includes(field.lang) ? field.lang : undefined;

    this.setState({
      isReady: true,
      isCreating: !indexPattern.fields.byName[field.name],
      errors: [],
      scriptingLangs,
      fieldFormatId: get(indexPattern, ['fieldFormatMap', field.name, 'type', 'id']),
      fieldFormatParams: field.format.params(),
    });

    this.setFieldTypes();
    this.setFieldTypeFormats();
  }

  setFieldTypes() {
    const { field } = this.state;
    const fieldTypes = get(FIELD_TYPES_BY_LANG, field.lang, DEFAULT_FIELD_TYPES);
    field.type = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];

    this.setState({
      isDeprecatedLang: this.deprecatedLangs.includes(field.lang),
      fieldTypes,
    });
  }

  setFieldTypeFormats() {
    const { field } = this.state;
    const DefaultFieldFormat = fieldFormats.getDefaultType(field.type);

    const fieldTypeFormats = [
      getDefaultFormat(DefaultFieldFormat),
      ...fieldFormats.byFieldType[field.type],
    ];

    this.setState({
      fieldTypeFormats,
    });
  }

  onFieldChange = (fieldName, value, callback) => {
    const changes = {};
    changes[fieldName] = value;
    this.setState({
      field: {
        ...this.state.field,
        ...changes,
      },
    }, typeof callback === 'function' ? callback : () => {});
  }

  onFormatChange = (formatId, params) => {
    const { getConfig } = this.props.helpers
    const { field, fieldTypeFormats } = this.state;
    const FieldFormat = formatId ? fieldTypeFormats.find((format) => format.id === formatId) : fieldTypeFormats[0];
    field.format = new FieldFormat(params, getConfig);

    this.setState({
      fieldFormatId: formatId,
      fieldFormatParams: field.format.params(),
    });
  }

  onFormatParamsChange = (newParams, hasError) => {
    const { fieldFormatId } = this.state;
    this.onFormatChange(fieldFormatId, newParams);
  }

  isDuplicateName() {
    const { isCreating, field, existingFieldNames } = this.state;
    return isCreating && existingFieldNames.includes(field.name);
  }

  renderName() {
    const { isCreating, field } = this.state;

    return isCreating ? (
      <EuiFormRow
        label="Name"
        helpText={this.isDuplicateName() ? (
          <span>
            <EuiIcon type="alert" color="warning" size="s" />&nbsp;
            <strong>Mapping Conflict:</strong>&nbsp;
            You already have a field with the name <EuiCode>{field.name}</EuiCode>. Naming your scripted
            field with the same name means you won&apos;t be able to query both fields at the same time.
          </span>
        ) : null}
      >
        <EuiFieldText
          value={field.name}
          placeholder="New scripted field"
          data-test-subj="editorFieldName"
          onChange={(e) => { this.onFieldChange('name', e.target.value);}}
        />
      </EuiFormRow>
    ) : null;
  }

  renderLanguage() {
    const { field, scriptingLangs, isDeprecatedLang } = this.state;

    return field.scripted ? (
      <EuiFormRow
        label="Language"
        helpText={isDeprecatedLang ? (
          <span>
            <EuiIcon type="alert" color="warning" size="s" />&nbsp;
            <strong>Deprecation Warning:</strong>&nbsp;
            <EuiCode>{field.lang}</EuiCode> is deprecated and support will be removed in the
            next major version of Kibana and Elasticsearch. We recommend using {(
              <EuiLink target="_window" href={getDocLink('scriptedFields.painless')}>Painless</EuiLink>
            )} for new scripted fields.
          </span>
        ) : null}
      >
        <EuiSelect
          value={field.lang}
          options={scriptingLangs.map(lang => { return { value: lang, text: lang }; })}
          data-test-subj="editorFieldLang"
          onChange={(e) => { this.onFieldChange('lang', e.target.value, this.setFieldTypes); }}
        />
      </EuiFormRow>
    ) : null;
  }

  renderType() {
    const { field, fieldTypes } = this.state;

    return (
      <EuiFormRow label="Type">
        <EuiSelect
          value={field.type}
          disabled={!field.scripted}
          options={fieldTypes.map(type => { return { value: type, text: type }; })}
          data-test-subj="editorFieldType"
          onChange={(e) => { this.onFieldChange('type', e.target.value, this.setFieldTypeFormats); }}
        />
      </EuiFormRow>
    );
  }

  renderFormat() {
    const { field, fieldTypeFormats, fieldFormatId, fieldFormatParams } = this.state;
    const { fieldFormatEditors } = this.props.helpers;
    const defaultFormat = fieldTypeFormats[0] && fieldTypeFormats[0].resolvedTitle;

    return (
      <Fragment>
        <EuiFormRow
          label={<span>Format {defaultFormat ? <span>(Default: <EuiCode>{defaultFormat}</EuiCode>)</span> : null}</span>}
          helpText={
            <span>
              Formatting allows you to control the way that specific values are displayed.
              It can also cause values to be completely changed and prevent highlighting in Discover from working.
            </span>
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
            fieldFormat={field.format}
            fieldFormatId={fieldFormatId}
            fieldFormatParams={fieldFormatParams}
            fieldFormatEditors={fieldFormatEditors}
            onChange={this.onFormatParamsChange}
          />
        ) : null }
      </Fragment>
    );
  }

  renderPopularity() {
    const { field } = this.state;

    return (
      <EuiFormRow label="Popularity">
        <EuiFieldNumber
          value={field.count}
          data-test-subj="editorFieldCount"
          onChange={(e) => { this.onFieldChange('count', Number(e.target.value));}}
        />
      </EuiFormRow>
    );
  }

  renderScript() {
    const { field } = this.state;

    return field.scripted ? (
      <EuiFormRow label="Script">
        <EuiTextArea
          value={field.script}
          data-test-subj="editorFieldScript"
          onChange={(e) => { this.onFieldChange('script', e.target.value); }}
        />
      </EuiFormRow>
    ) : null;
  }

  renderActions() {
    const { isCreating } = this.state;

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton fill>{isCreating ? 'Create field' : 'Edit field'}</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty>Cancel</EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    const { isReady, scriptingLangs, field } = this.state;
    return isReady ? (
      <div>
        <EuiForm>
          <ScriptingDisabledCallOut isVisible={field.scripted && !scriptingLangs.length} />
          {this.renderName()}
          {this.renderLanguage()}
          {this.renderType()}
          {this.renderFormat()}
          {this.renderPopularity()}
          {this.renderScript()}
          <ScriptingHelpCallOut isVisible={field.scripted} />
          {this.renderActions()}
        </EuiForm>
        <EuiSpacer size="m" />
      </div>
    ) : null;
  }
}
