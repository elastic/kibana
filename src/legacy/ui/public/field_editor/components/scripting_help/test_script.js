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

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiCodeBlock,
  EuiComboBox,
  EuiFormRow,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';

export class TestScript extends Component {
  state = {
    isLoading: false,
    additionalFields: [],
  }

  componentDidMount() {
    if (this.props.script) {
      this.previewScript();
    }
  }

  previewScript = async () => {
    const {
      indexPattern,
      lang,
      name,
      script,
      executeScript,
    } = this.props;

    if (!script || script.length === 0) {
      return;
    }

    this.setState({
      isLoading: true,
    });

    const scriptResponse = await executeScript({
      name,
      lang,
      script,
      indexPatternTitle: indexPattern.title,
      additionalFields: this.state.additionalFields.map(option => {
        return option.value;
      })
    });

    if (scriptResponse.status !== 200) {
      this.setState({
        isLoading: false,
        previewData: scriptResponse
      });
      return;
    }

    this.setState({
      isLoading: false,
      previewData: scriptResponse.hits.hits.map(hit => ({
        _id: hit._id,
        ...hit._source,
        ...hit.fields,
      })),
    });
  }

  onAdditionalFieldsChange = (selectedOptions) => {
    this.setState({
      additionalFields: selectedOptions
    });
  }

  renderPreview() {
    const { previewData } = this.state;

    if (!previewData) {
      return null;
    }

    if (previewData.error) {
      return (
        <EuiCallOut
          title="There's an error in your script"
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
        <EuiTitle size="xs"><p>First 10 results</p></EuiTitle>
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
    const fields = [];

    this.props.indexPattern.fields
      .filter(field => {
        return !field.name.startsWith('_');
      })
      .forEach(field => {
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
        options: fieldsList.sort().map(fieldName => {
          return { value: fieldName, label: fieldName };
        })
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
          label="Additional fields"
        >
          <EuiComboBox
            placeholder="Select..."
            options={fields}
            selectedOptions={this.state.additionalFields}
            onChange={this.onAdditionalFieldsChange}
            data-test-subj="additionalFieldsSelect"
          />
        </EuiFormRow>

        <EuiButton
          onClick={this.previewScript}
          disabled={this.props.script ? false : true}
          isLoading={this.state.isLoading}
          data-test-subj="runScriptButton"
        >
          Run script
        </EuiButton>
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        <EuiSpacer />
        <EuiText>
          <h3>Preview results</h3>
          <p>
            Run your script to preview the first 10 results. You can also select some
            additional fields to include in your results to gain more context.
          </p>
        </EuiText>
        <EuiSpacer />
        {this.renderToolbar()}
        <EuiSpacer />
        {this.renderPreview()}
      </Fragment>
    );
  }
}

TestScript.propTypes = {
  indexPattern: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  name: PropTypes.string,
  script: PropTypes.string,
  executeScript: PropTypes.func.isRequired,
};

TestScript.defaultProps = {
  name: 'myScriptedField',
};
