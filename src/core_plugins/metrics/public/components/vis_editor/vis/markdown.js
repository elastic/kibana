import tickFormatter from '../../../lib/tick_formatter';
import moment from 'moment';
import _ from 'lodash';
import { getLastValue } from '../../../visualizations/lib';
import React from 'react';
import color from 'color';
import Markdown from 'react-markdown';
import calculateLabel from '../lib/calculate_label';
import replaceVars from '../../../lib/replace_vars';
import convertSeriesToVars from '../lib/convert_series_to_vars';

function hasSeperateAxis(row) {
  return row.seperate_axis;
}

const formatLookup = {
  'bytes': '0.0b',
  'number': '0,0.[00]',
  'percent': '0.[00]%'
};

export default React.createClass({

  render() {
    const { backgroundColor, model, visData } = this.props;
    const series = _.get(visData, `${model.id}.series`, []);
    const variables = convertSeriesToVars(series, model);
    const style = { };
    let reversed = false;
    const panelBackgroundColor = model.background_color || backgroundColor;
    if (panelBackgroundColor) {
      style.backgroundColor = panelBackgroundColor;
      reversed = color(panelBackgroundColor).luminosity() < 0.45;
    }
    let markdown;
    if (model.markdown) {
      const markdownSource = replaceVars(model.markdown, {}, {
        _all: variables,
        ...variables
      });
      let className = 'thorMarkdown';
      let contentClassName = `thorMarkdown__content ${model.markdown_vertical_align}`;
      if (model.markdown_scrollbars) contentClassName += ' scrolling';
      if (reversed) className += ' reversed';
      markdown = (
        <div className={className}>
          <style type="text/css">
            {model.markdown_css}
          </style>
          <div className={contentClassName}>
            <div id={`markdown-${model.id}`}>
              <Markdown source={markdownSource}/>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="dashboard__visualization" style={style}>
        {markdown}
      </div>
    );
  }
});

