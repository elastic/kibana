/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
// Markdown builder is not yet properly accessible

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import { createTickFormatter } from './lib/tick_formatter';
import { convertSeriesToVars } from './lib/convert_series_to_vars';
import _ from 'lodash';
import { CodeEditor, MarkdownLang } from '../../../../../kibana_react/public';

import { EuiText, EuiCodeBlock, EuiSpacer, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { getDataViewsStart } from '../../services';
import { fetchIndexPattern } from '../../../common/index_patterns_utils';

export class MarkdownEditor extends Component {
  constructor(props) {
    super(props);
    this.state = { fieldFormatMap: undefined };
  }

  handleChange = (value) => {
    this.props.onChange({ markdown: value });
  };

  handleOnLoad = (editor) => {
    this.editor = editor;
  };

  handleVarClick = (snippet) => () => {
    if (this.editor) {
      const range = this.editor.getSelection();

      this.editor.executeEdits('', [{ range, text: snippet }]);
    }
  };

  async componentDidMount() {
    const dataViews = getDataViewsStart();
    const { indexPattern } = await fetchIndexPattern(this.props.model.index_pattern, dataViews);
    this.setState({ fieldFormatMap: indexPattern?.fieldFormatMap });
  }

  render() {
    const { visData, model, getConfig } = this.props;

    if (!visData) {
      return null;
    }
    const series = _.get(visData, `${model.id}.series`, []);
    const variables = convertSeriesToVars(series, model, getConfig, this.state.fieldFormatMap);
    const rows = [];
    const rawFormatter = createTickFormatter('0.[0000]', null, getConfig);

    const createPrimitiveRow = (key) => {
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

    const createArrayRow = (key) => {
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
      <div className="tvbMarkdownEditor">
        <div className="tvbMarkdownEditor__editor">
          <CodeEditor
            editorDidMount={this.handleOnLoad}
            languageId={MarkdownLang}
            options={{
              fontSize: '14px',
              wordWrap: 'on',
            }}
            value={model.markdown}
            onChange={this.handleChange}
          />
        </div>
        <div className="tvbMarkdownEditor__variables">
          <EuiText>
            <p>
              <FormattedMessage
                id="visTypeTimeseries.markdownEditor.howToUseVariablesInMarkdownDescription"
                defaultMessage="The following variables can be used in the Markdown by using the Handlebar (mustache) syntax.
                {handlebarLink} on the available expressions."
                values={{
                  handlebarLink: (
                    <a
                      href="https://ela.st/handlebars-docs"
                      target="_BLANK"
                      rel="noreferrer noopener"
                    >
                      <FormattedMessage
                        id="visTypeTimeseries.markdownEditor.howUseVariablesInMarkdownDescription.documentationLinkText"
                        defaultMessage="Click here for documentation"
                      />
                    </a>
                  ),
                }}
              />
            </p>
          </EuiText>
          <table className="table" data-test-subj="tsvbMarkdownVariablesTable">
            <thead>
              <tr>
                <th scope="col">
                  <FormattedMessage
                    id="visTypeTimeseries.markdownEditor.nameLabel"
                    defaultMessage="Name"
                  />
                </th>
                <th scope="col">
                  <FormattedMessage
                    id="visTypeTimeseries.markdownEditor.valueLabel"
                    defaultMessage="Value"
                  />
                </th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>

          {rows.length === 0 && (
            <EuiTitle
              size="xxs"
              className="tsvbMarkdownVariablesTable__noVariables"
              data-test-subj="tvbMarkdownEditor__noVariables"
            >
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.markdownEditor.noVariablesAvailableDescription"
                  defaultMessage="No variables available for the selected data metrics."
                />
              </span>
            </EuiTitle>
          )}

          <EuiSpacer />

          <EuiText>
            <p>
              <FormattedMessage
                id="visTypeTimeseries.markdownEditor.howToAccessEntireTreeDescription"
                defaultMessage="There is also a special variable named {all} which you can use to access the entire tree. This is useful for
                creating lists with data from a group by:"
                values={{ all: <code>_all</code> }}
              />
            </p>
          </EuiText>

          <EuiSpacer />

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
  getConfig: PropTypes.func,
  visData: PropTypes.object,
};
