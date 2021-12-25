/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './test_script.scss';

import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiCodeBlock,
  EuiComboBox,
  EuiFormRow,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { Query, buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '../../../../../../../plugins/data/public';
import { DataView } from '../../../../../../../plugins/data_views/public';
import { context as contextType } from '../../../../../../kibana_react/public';
import { IndexPatternManagmentContextValue } from '../../../../types';
import { ExecuteScript } from '../../types';

interface TestScriptProps {
  indexPattern: DataView;
  lang: string;
  name?: string;
  script?: string;
  executeScript: ExecuteScript;
}

interface AdditionalField {
  value: string;
  label: string;
}

interface TestScriptState {
  isLoading: boolean;
  additionalFields: AdditionalField[];
  previewData?: Record<string, any>;
}

export class TestScript extends Component<TestScriptProps, TestScriptState> {
  static contextType = contextType;

  public declare readonly context: IndexPatternManagmentContextValue;

  defaultProps = {
    name: 'myScriptedField',
  };

  state = {
    isLoading: false,
    additionalFields: [],
    previewData: undefined,
  };

  componentDidMount() {
    if (this.props.script) {
      this.previewScript();
    }
  }

  previewScript = async (searchContext?: { query?: Query | undefined }) => {
    const { indexPattern, name, script, executeScript } = this.props;

    if (!script || script.length === 0) {
      return;
    }

    this.setState({
      isLoading: true,
    });

    let query;
    if (searchContext) {
      const esQueryConfigs = getEsQueryConfig(this.context.services.uiSettings);
      query = buildEsQuery(this.props.indexPattern, searchContext.query || [], [], esQueryConfigs);
    }

    const scriptResponse = await executeScript({
      name: name as string,
      script,
      indexPatternTitle: indexPattern.title,
      query,
      additionalFields: this.state.additionalFields.map((option: AdditionalField) => option.value),
      http: this.context.services.http,
    });

    if (scriptResponse.status !== 200) {
      this.setState({
        isLoading: false,
        previewData: scriptResponse,
      });
      return;
    }

    this.setState({
      isLoading: false,
      previewData: scriptResponse.hits?.hits.map((hit: any) => ({
        _id: hit._id,
        ...hit._source,
        ...hit.fields,
      })),
    });
  };

  onAdditionalFieldsChange = (selectedOptions: AdditionalField[]) => {
    this.setState({
      additionalFields: selectedOptions,
    });
  };

  renderPreview(previewData: { error: any } | undefined) {
    if (!previewData) {
      return null;
    }

    if (previewData.error) {
      return (
        <EuiCallOut
          title={i18n.translate('indexPatternManagement.testScript.errorMessage', {
            defaultMessage: `There's an error in your script`,
          })}
          color="danger"
          iconType="cross"
        >
          <EuiCodeBlock
            language="json"
            className="scriptPreviewCodeBlock"
            data-test-subj="scriptedFieldPreview"
          >
            {JSON.stringify(previewData.error, null, ' ')}
          </EuiCodeBlock>
        </EuiCallOut>
      );
    }

    return (
      <Fragment>
        <EuiTitle size="xs">
          <p>
            <FormattedMessage
              id="indexPatternManagement.testScript.resultsLabel"
              defaultMessage="First 10 results"
            />
          </p>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiCodeBlock
          language="json"
          className="scriptPreviewCodeBlock"
          data-test-subj="scriptedFieldPreview"
        >
          {JSON.stringify(previewData, null, ' ')}
        </EuiCodeBlock>
      </Fragment>
    );
  }

  renderToolbar() {
    const fieldsByTypeMap = new Map();
    const fields: EuiComboBoxOptionOption[] = [];

    this.props.indexPattern.fields
      .getAll()
      .filter((field) => {
        const isMultiField = field.isSubtypeMulti();
        return !field.name.startsWith('_') && !isMultiField && !field.scripted;
      })
      .forEach((field) => {
        if (fieldsByTypeMap.has(field.type)) {
          const fieldsList = fieldsByTypeMap.get(field.type);
          fieldsList.push(field.name);
          fieldsByTypeMap.set(field.type, fieldsList);
        } else {
          fieldsByTypeMap.set(field.type, [field.name]);
        }
      });

    fieldsByTypeMap.forEach((fieldsList, fieldType) => {
      fields.push({
        label: fieldType,
        options: fieldsList.sort().map((fieldName: string) => {
          return { value: fieldName, label: fieldName };
        }),
      });
    });

    fields.sort((a, b) => {
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    });

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('indexPatternManagement.testScript.fieldsLabel', {
            defaultMessage: 'Additional fields',
          })}
          fullWidth
        >
          <EuiComboBox
            placeholder={i18n.translate('indexPatternManagement.testScript.fieldsPlaceholder', {
              defaultMessage: 'Select...',
            })}
            options={fields}
            selectedOptions={this.state.additionalFields}
            onChange={(selected) => this.onAdditionalFieldsChange(selected as AdditionalField[])}
            data-test-subj="additionalFieldsSelect"
            fullWidth
          />
        </EuiFormRow>

        <div className="testScript__searchBar">
          <this.context.services.data.ui.SearchBar
            appName={'indexPatternManagement'}
            showFilterBar={false}
            showDatePicker={false}
            showQueryInput={true}
            query={this.context.services.data.query.queryString.getDefaultQuery()}
            onQuerySubmit={this.previewScript}
            indexPatterns={[this.props.indexPattern]}
            customSubmitButton={
              <EuiButton
                disabled={this.props.script ? false : true}
                isLoading={this.state.isLoading}
                data-test-subj="runScriptButton"
              >
                <FormattedMessage
                  id="indexPatternManagement.testScript.submitButtonLabel"
                  defaultMessage="Run script"
                />
              </EuiButton>
            }
          />
        </div>
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        <EuiSpacer />
        <EuiText>
          <h3>
            <FormattedMessage
              id="indexPatternManagement.testScript.resultsTitle"
              defaultMessage="Preview results"
            />
          </h3>
          <p>
            <FormattedMessage
              id="indexPatternManagement.testScript.instructions"
              defaultMessage="Run your script to preview the first 10 results. You can also select some additional
              fields to include in your results to gain more context or add a query to filter on
              specific documents."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        {this.renderToolbar()}
        <EuiSpacer />
        {this.renderPreview(this.state.previewData)}
      </Fragment>
    );
  }
}
