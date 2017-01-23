import SeriesEditor from '../series_editor';
import IndexPattern from '../index_pattern';
import AceEditor from 'react-ace';
import brace from 'brace';
import 'brace/mode/less';
import React from 'react';
import Select from 'react-select';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import DataFormatPicker from '../data_format_picker';
import ColorPicker from '../color_picker';
import YesNo from '../yes_no';
import MarkdownEditor from '../markdown_editor';
import less from 'less/lib/less-browser';
const lessC = less(window, { env: 'production' });
export default React.createClass({
  getInitialState() {
    return { selectedTab: 'markdown' };
  },

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  },

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
  },

  render() {
    const { model } = this.props;
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    const positionOptions = [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' }
    ];

    const legendPositionOptions = [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' },
      { label: 'Bottom', value: 'bottom' }
    ];

    const alignOptions = [
      { label: 'Top', value: 'top' },
      { label: 'Middle', value: 'middle' },
      { label: 'Bottom', value: 'bottom' }
    ];
    let view;
    if (selectedTab === 'markdown') {
      view = (<MarkdownEditor {...this.props}/>);
    } else if (selectedTab === 'data') {
      view = (<SeriesEditor {...this.props}/>);
    } else {
      view = (
        <div className="vis_editor__container">
          <IndexPattern with-interval={true} {...this.props}/>
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
              ref="filter"
              onChange={handleTextChange('filter')}
              defaultValue={model.filter}/>
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
          <div className="vis_editor__label" style={{ margin: '0 0 10px 0' }}>Custom CSS (supports Less)</div>
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
            onClick={e => this.switchTab('markdown')}>Markdown</div>
          <div className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={e => this.switchTab('data')}>Data</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={e => this.switchTab('options')}>Panel Options</div>
        </div>
        {view}
      </div>
    );
  }
});


