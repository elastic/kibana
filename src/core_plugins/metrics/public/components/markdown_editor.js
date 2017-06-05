/* eslint max-len:0 */
import React, { Component, PropTypes } from 'react';
import tickFormatter from './lib/tick_formatter';
import convertSeriesToVars from './lib/convert_series_to_vars';
import AceEditor from 'react-ace';
import _ from 'lodash';
import 'brace/mode/markdown';
import 'brace/theme/github';

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
    const { model, visData } = this.props;
    const series = _.get(visData, `${model.id}.series`, []);
    const variables = convertSeriesToVars(series, model);
    const rows = [];
    const rawFormatter = tickFormatter('0.[0000]');

    const createPrimativeRow = key => {
      const snippet = `{{ ${key} }}`;
      let value = _.get(variables, key);
      if (/raw$/.test(key)) value = rawFormatter(value);
      rows.push(
        <tr key={key}>
          <td>
            <a onClick={this.handleVarClick(snippet)}>
              { snippet }
            </a>
          </td>
          <td>
            <code>"{ value }"</code>
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
            <a onClick={this.handleVarClick(snippet)}>
              { `{{ ${key} }}` }
            </a>
          </td>
          <td>
            <code>[ [ "{date}", "{value}" ], ... ]</code>
          </td>
        </tr>
      );
    };

    function walk(obj, path = []) {
      for (const name in obj) {
        if (_.isArray(obj[name])) {
          createArrayRow(path.concat(name).join('.'));
        } else if (_.isObject(obj[name])) {
          walk(obj[name], path.concat(name));
        } else {
          createPrimativeRow(path.concat(name).join('.'));
        }
      }
    }

    walk(variables);


    return (
      <div className="vis_editor__markdown">
        <div className="vis_editor__markdown-editor">
          <AceEditor
            onLoad={this.handleOnLoad}
            mode="markdown"
            theme="github"
            width="100%"
            height="100%"
            name={`ace-${model.id}`}
            setOptions={{ wrap: true, fontSize: '14px' }}
            value={model.markdown}
            onChange={this.handleChange}/>
        </div>
        <div className="vis_editor__markdown-variables">
          <div>The following variables can be used in the Markdown by using the Handlebar (mustache) syntax. <a href="http://handlebarsjs.com/expressions.html" target="_BLANK">Click here for documentation</a> on the available expressions.</div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </table>
          <div className="vis_editor__markdown-code-desc">There is also a special variable named <code>_all</code> which you can use to access the entire tree. This is useful for creating lists with data from a group by...</div>
          <pre>
            <code>{`# All servers:

{{#each _all}}
- {{ label }} {{ last.formatted }}
{{/each}}`}</code>
          </pre>
        </div>
      </div>
    );
  }

}

MarkdownEditor.propTypes = {
  onChange: PropTypes.func,
  model: PropTypes.object,
  visData: PropTypes.object
};

export default MarkdownEditor;
