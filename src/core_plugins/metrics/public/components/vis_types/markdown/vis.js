import React, { PropTypes } from 'react';
import _ from 'lodash';
import color from 'color';
import Markdown from 'react-markdown';
import replaceVars from '../../lib/replace_vars';
import convertSeriesToVars from '../../lib/convert_series_to_vars';

function MarkdownVisualization(props) {
  const { backgroundColor, model, visData } = props;
  const series = _.get(visData, `${model.id}.series`, []);
  const variables = convertSeriesToVars(series, model);
  const style = { };
  let reversed = props.reversed;
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

MarkdownVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object
};

export default MarkdownVisualization;
