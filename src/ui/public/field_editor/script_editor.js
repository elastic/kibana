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
import './script_editor.less';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { kfetch } from 'ui/kfetch';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiTextArea,
  EuiLink,
  EuiCodeBlock,
  EuiCallOut,
  EuiComboBox,
  EuiFieldNumber,
} from '@elastic/eui';

export class ScriptEditor extends Component {

  state = {
    isLoading: false,
    sourceFields: [],
    size: 10,
  }

  executeScript = async () => {
    const {
      indexPattern,
      lang,
      name,
      script
    } = this.props;

    this.setState({
      isLoading: true,
    });

    // Using _msearch because _search with index name in path dorks everything up
    const header = {
      index: indexPattern.title,
      ignore_unavailable: true,
      timeout: 30000
    };
    const search = {
      query: {
        match_all: {}
      },
      script_fields: {
        [name]: {
          script: {
            lang: lang,
            source: script
          }
        }
      }
    };
    if (!isNaN(this.state.size)) {
      search.size = this.state.size;
    }
    if (this.state.sourceFields.length > 0) {
      search._source = this.state.sourceFields.map(option => {
        return option.value;
      });
    }
    const body = `${JSON.stringify(header)}\n${JSON.stringify(search)}\n`;
    const esResp = await kfetch({ method: 'POST', pathname: '/elasticsearch/_msearch', body });
    // unwrap _msearch response
    const scriptResponse = esResp.responses[0];

    if (scriptResponse.status !== 200) {
      this.setState({
        isLoading: false,
        previewData: scriptResponse.error
      });
      return;
    }

    this.setState({
      isLoading: false,
      previewData: scriptResponse.hits.hits.map(hit => {
        return Object.assign({ _id: hit._id }, hit._source, hit.fields);
      })
    });
  }

  onSourceFieldsChange = (selectedOptions) => {
    this.setState({
      sourceFields: selectedOptions
    });
  }

  onSizeChange = (e) => {
    this.setState({
      size: parseInt(e.target.value, 10)
    });
  };

  renderPreview() {
    if (!this.state.previewData) {
      return (
        <EuiCallOut
          title="Test out your scripted fields"
        >
          <p>
            Click the play button to preview the results of your script.
          </p>
        </EuiCallOut>
      );
    }

    return (
      <EuiCodeBlock language="json" className="scriptPreviewCodeBlock">
        {JSON.stringify(this.state.previewData, null, ' ')}
      </EuiCodeBlock>
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
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={this.executeScript}
            iconType="play"
            disabled={this.props.script ? false : true}
            isLoading={this.state.isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            placeholder="Size"
            value={this.state.size}
            onChange={this.onSizeChange}
            aria-label="Specify the number documents to search for script preview"
            min="0"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiComboBox
            placeholder="Select..."
            options={fields}
            selectedOptions={this.state.sourceFields}
            onChange={this.onSourceFieldsChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    const {
      script,
      onScriptChange,
      showScriptingHelp
    } = this.props;

    const isInvalid = !script || !script.trim();

    return (
      <div>

        <label
          className="euiFormLabel"
        >
          Script
        </label>

        {this.renderToolbar()}

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTextArea
              value={script}
              data-test-subj="editorFieldScript"
              onChange={onScriptChange}
              isInvalid={isInvalid}
            />
            <div
              className="euiFormHelpText euiFormRow__text"
            >
              <EuiLink onClick={showScriptingHelp}>Scripting help</EuiLink>
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            {this.renderPreview()}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}

ScriptEditor.propTypes = {
  indexPattern: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  name: PropTypes.string,
  script: PropTypes.string,
  onScriptChange: PropTypes.func.isRequired,
  showScriptingHelp: PropTypes.func.isRequired,
};

ScriptEditor.defaultProps = {
  name: 'myScriptedField',
};
