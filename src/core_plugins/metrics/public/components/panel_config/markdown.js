import React, { Component, PropTypes } from 'react';
import SeriesEditor from '../series_editor';
import IndexPattern from '../index_pattern';
import AceEditor from 'react-ace';
import 'brace/mode/less';
import Select from 'react-select';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorPicker from '../color_picker';
import YesNo from '../yes_no';
import MarkdownEditor from '../markdown_editor';
import less from 'less/lib/less-browser';
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

    const alignOptions = [
      { label: 'Top', value: 'top' },
      { label: 'Middle', value: 'middle' },
      { label: 'Bottom', value: 'bottom' }
    ];
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
          onChange={this.props.onChange} />
      );
    } else {
      view = (
        <div className="vis_editor__container">
          <IndexPattern
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange}/>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Background Color</div>
            <ColorPicker
              onChange={this.props.onChange}
              name="background_color"
              value={model.background_color}/>
            <div className="vis_editor__label">Panel Filter</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('filter')}
              value={model.filter} />
            <div className="vis_editor__label">Ignore Global Filter</div>
            <YesNo
              value={model.ignore_global_filter}
              name="ignore_global_filter"
              onChange={this.props.onChange}/>
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Show Scrollbars</div>
            <YesNo
              value={model.markdown_scrollbars}
              name="markdown_scrollbars"
              onChange={this.props.onChange}/>
            <div className="vis_editor__label">Vertical Alignment</div>
            <div className="vis_editor__row_item">
              <Select
                autosize={true}
                clearable={false}
                options={alignOptions}
                value={model.markdown_vertical_align}
                onChange={handleSelectChange('markdown_vertical_align')}/>
            </div>
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Custom CSS (supports Less)</div>
        </div>
          <div className="vis_editor__ace-editor">
            <AceEditor
              mode="less"
              theme="github"
              width="100%"
              name={`ace-css-${model.id}`}
              setOptions={{ fontSize: '14px' }}
              value={ model.markdown_less}
              onChange={this.handleCSSChange}/>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs">
          <div className={`kbnTabs__tab${selectedTab === 'markdown' && '-active' || ''}`}
            onClick={() => this.switchTab('markdown')}>Markdown</div>
          <div className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={() => this.switchTab('data')}>Data</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}>Panel Options</div>
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
};

export default MarkdownPanelConfig;
