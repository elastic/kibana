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

/* eslint max-len:0 */
/* eslint-disable jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
// Markdown builder is not yet properly accessible

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import tickFormatter from './lib/tick_formatter';
import convertSeriesToVars from './lib/convert_series_to_vars';
import { KuiCodeEditor } from '@kbn/ui-framework/components';
import _ from 'lodash';
import 'brace/mode/markdown';
import 'brace/theme/github';

import {
  EuiText,
  EuiCodeBlock,
} from '@elastic/eui';

class MarkdownEditor extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleOnLoad = this.handleOnLoad.bind(this);
  }

  handleChange(value) {
    this.props.onChange({ markdown: value });
  }

  handleOnLoad(ace) {
    this.ace = ace;
  }

  handleVarClick(snippet) {
    return () => {
      if (this.ace) this.ace.insert(snippet);
    };
  }

  render() {
    const { model, visData, dateFormat } = this.props;
    const series = _.get(visData, `${model.id}.series`, []);
    const variables = convertSeriesToVars(series, model, dateFormat, this.props.getConfig);
    const rows = [];
    const rawFormatter = tickFormatter('0.[0000]', null, this.props.getConfig);

    const createPrimitiveRow = key => {
      const snippet = `{{ ${key} }}`;
      let value = _.get(variables, key);
      if (/raw$/.test(key)) value = rawFormatter(value);
      rows.push(
        <tr key={key}>
          <td>
            <a onClick={this.handleVarClick(snippet)}>{snippet}</a>
          </td>
          <td>
            <code>&ldquo;{value}&rdquo;</code>
          </td>
        </tr>
      );
    };

    const createArrayRow = key => {
      const snippet = `{{# ${key} }}{{/ ${key} }}`;
      const date = _.get(variables, `${key}[0][0]`);
      let value = _.get(variables, `${key}[0][1]`);
      if (/raw$/.test(key)) value = rawFormatter(value);
      rows.push(
        <tr key={key}>
          <td>
            <a onClick={this.handleVarClick(snippet)}>{`{{ ${key} }}`}</a>
          </td>
          <td>
            <code>
              [ [ &ldquo;{date}&rdquo;, &ldquo;{value}&rdquo; ], ... ]
            </code>
          </td>
        </tr>
      );
    };

    function walk(obj, path = []) {
      for (const name in obj) {
        if (Array.isArray(obj[name])) {
          createArrayRow(path.concat(name).join('.'));
        } else if (_.isObject(obj[name])) {
          walk(obj[name], path.concat(name));
        } else {
          createPrimitiveRow(path.concat(name).join('.'));
        }
      }
    }

    walk(variables);

    return (
      <div className="vis_editor__markdown">
        <div className="vis_editor__markdown-editor">
          <KuiCodeEditor
            onLoad={this.handleOnLoad}
            mode="markdown"
            theme="github"
            width="100%"
            height="100%"
            name={`ace-${model.id}`}
            setOptions={{ wrap: true, fontSize: '14px' }}
            value={model.markdown}
            onChange={this.handleChange}
          />
        </div>
        <div className="vis_editor__markdown-variables">
          <EuiText>
            The following variables can be used in the Markdown by using the Handlebar (mustache) syntax.{' '}
            <a href="http://handlebarsjs.com/expressions.html" target="_BLANK">
              Click here for documentation
            </a>{' '}
            on the available expressions.
          </EuiText>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
          {rows.length === 0 && (
            <div className="vis_editor__no-markdown-variables">No variables available for the selected data metrics.</div>
          )}

          <div className="vis_editor__markdown-code-desc">
            <EuiText>
              <p>
                There is also a special variable named <code>_all</code> which you can use to access the entire tree. This is useful for
                creating lists with data from a group by...
              </p>
            </EuiText>
          </div>

          <EuiCodeBlock>
            {`# All servers:

            {{#each _all}}
            - {{ label }} {{ last.formatted }}
            {{/each}}`}
          </EuiCodeBlock>
        </div>
      </div>
    );
  }
}

MarkdownEditor.propTypes = {
  onChange: PropTypes.func,
  model: PropTypes.object,
  visData: PropTypes.object,
  dateFormat: PropTypes.string
};

export default MarkdownEditor;
