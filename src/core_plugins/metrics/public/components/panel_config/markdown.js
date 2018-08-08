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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SeriesEditor from '../series_editor';
import { IndexPattern } from '../index_pattern';
import 'brace/mode/less';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorPicker from '../color_picker';
import YesNo from '../yes_no';
import MarkdownEditor from '../markdown_editor';
import less from 'less/lib/less-browser';
import { KuiCodeEditor } from '@kbn/ui-framework/components';
import {
  htmlIdGenerator,
  EuiComboBox,
} from '@elastic/eui';
const lessC = less(window, { env: 'production' });

class MarkdownPanelConfig extends Component {

  constructor(props) {
    super(props);
    this.state = { selectedTab: 'markdown' };
    this.handleCSSChange = this.handleCSSChange.bind(this);
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  handleCSSChange(value) {
    const { model } = this.props;
    const lessSrc = `#markdown-${model.id} {
  ${value}
}`;
    lessC.render(lessSrc, { compress: true }, (e, output) => {
      const parts = { markdown_less: value };
      if (output) {
        parts.markdown_css = output.css;
      }
      this.props.onChange(parts);
    });
  }

  render() {
    const defaults = { filter: '' };
    const model = { ...defaults, ...this.props.model };
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);

    const htmlId = htmlIdGenerator();

    const alignOptions = [
      { label: 'Top', value: 'top' },
      { label: 'Middle', value: 'middle' },
      { label: 'Bottom', value: 'bottom' }
    ];
    const selectedAlignOption = alignOptions.find(option => {
      return model.markdown_vertical_align === option.value;
    });
    let view;
    if (selectedTab === 'markdown') {
      view = (<MarkdownEditor {...this.props}/>);
    } else if (selectedTab === 'data') {
      view = (
        <SeriesEditor
          colorPicker={false}
          fields={this.props.fields}
          model={this.props.model}
          name={this.props.name}
          onChange={this.props.onChange}
        />
      );
    } else {
      view = (
        <div className="vis_editor__container">
          <IndexPattern
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange}
          />
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Background Color</div>
            <ColorPicker
              onChange={this.props.onChange}
              name="background_color"
              value={model.background_color}
            />
            <label className="vis_editor__label" htmlFor={htmlId('panelFilter')}>
              Panel Filter
            </label>
            <input
              id={htmlId('panelFilter')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('filter')}
              value={model.filter}
            />
            <div className="vis_editor__label">Ignore Global Filter</div>
            <YesNo
              value={model.ignore_global_filter}
              name="ignore_global_filter"
              onChange={this.props.onChange}
            />
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Show Scrollbars</div>
            <YesNo
              value={model.markdown_scrollbars}
              name="markdown_scrollbars"
              onChange={this.props.onChange}
            />
            <label className="vis_editor__label" htmlFor={htmlId('valign')}>
              Vertical Alignment
            </label>
            <div className="vis_editor__row_item">
              <EuiComboBox
                isClearable={false}
                id={htmlId('valign')}
                options={alignOptions}
                selectedOptions={selectedAlignOption ? [selectedAlignOption] : []}
                onChange={handleSelectChange('markdown_vertical_align')}
                singleSelection={true}
              />
            </div>
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Custom CSS (supports Less)</div>
          </div>
          <div className="vis_editor__ace-editor">
            <KuiCodeEditor
              mode="less"
              theme="github"
              width="100%"
              name={`ace-css-${model.id}`}
              setOptions={{ fontSize: '14px' }}
              value={model.markdown_less}
              onChange={this.handleCSSChange}
            />
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs" role="tablist">
          <button
            role="tab"
            aria-selected={selectedTab === 'markdown'}
            className={`kbnTabs__tab${selectedTab === 'markdown' && '-active' || ''}`}
            onClick={() => this.switchTab('markdown')}
          >Markdown
          </button>
          <button
            data-test-subj="markdownDataBtn"
            role="tab"
            aria-selected={selectedTab === 'data'}
            className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={() => this.switchTab('data')}
          >Data
          </button>
          <button
            role="tab"
            aria-selected={selectedTab === 'options'}
            className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}
          >Panel Options
          </button>
        </div>
        {view}
      </div>
    );
  }
}

MarkdownPanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData: PropTypes.object,
  dateFormat: PropTypes.string
};

export default MarkdownPanelConfig;
