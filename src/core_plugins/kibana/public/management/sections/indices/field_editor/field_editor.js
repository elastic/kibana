import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { intersection, union, get } from 'lodash';

import {
  getDeprecatedScriptingLanguages,
  getSupportedScriptingLanguages,
} from 'ui/scripting_languages';

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

import { FIELD_TYPES_BY_LANG, DEFAULT_FIELD_TYPES } from './constants';
import { copyField } from './lib';

export class FieldEditor extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    field: PropTypes.object.isRequired,
    helpers: PropTypes.shape({
      Field: PropTypes.func.isRequired,
      getEnabledScriptingLanguages: PropTypes.func.isRequired,
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
      existingFieldNames: props.indexPattern.fields.map(field => field.name),
      field: copyField(props.field, props.indexPattern, props.helpers.Field),
    };
    this.supportedLangs = getSupportedScriptingLanguages();
    this.deprecatedLangs = getDeprecatedScriptingLanguages();
    this.init();
  }

  async init() {
    const { getEnabledScriptingLanguages } = this.props.helpers;
    const { field } = this.state;

    const enabledLangs = await getEnabledScriptingLanguages();
    const scriptingLangs = intersection(enabledLangs, union(this.supportedLangs, this.deprecatedLangs));
    const fieldLang = scriptingLangs.includes(field.lang) ? field.lang : undefined;

    this.setState({
      isReady: true,
      isCreating: !this.props.indexPattern.fields.byName[field.name],
      errors: [],
      scriptingLangs,
      field: {
        ...field,
        lang: fieldLang,
      },
    });

    this.setFieldTypes();
  }

  setFieldTypes() {
    const { field } = this.state;
    const fieldTypes = get(FIELD_TYPES_BY_LANG, field.lang, DEFAULT_FIELD_TYPES);
    const fieldType = fieldTypes.includes(field.type) ? field.type : fieldTypes[0];
    this.setState({
      isDeprecatedLang: this.deprecatedLangs.includes(field.lang),
      fieldTypes,
      field: {
        ...field,
        type: fieldType,
      },
    });
  }

  onFieldChange = (fieldName, value) => {
    const changes = {};
    changes[fieldName] = value;
    this.setState({
      field: {
        ...this.state.field,
        ...changes,
      },
    });
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
          onChange={(e) => { this.onFieldChange('lang', e.target.value); this.setFieldTypes(); }}
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
          onChange={(e) => { this.onFieldChange('type', e.target.value);}}
        />
      </EuiFormRow>
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
