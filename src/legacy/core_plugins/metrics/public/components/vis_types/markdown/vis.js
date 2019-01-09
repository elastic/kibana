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
import React from 'react';
import _ from 'lodash';
import color from 'color';
import Markdown from 'react-markdown';
import replaceVars from '../../lib/replace_vars';
import convertSeriesToVars from '../../lib/convert_series_to_vars';
import ErrorComponent from '../../error';
import uuid from 'uuid';

const getMarkdownId = id => `markdown-${id}`;

function MarkdownVisualization(props) {
  const { backgroundColor, model, visData, dateFormat } = props;
  const series = _.get(visData, `${model.id}.series`, []);
  const variables = convertSeriesToVars(series, model, dateFormat, props.getConfig);
  const style = {};
  const markdownElementId = getMarkdownId(uuid.v1());

  let reversed = props.reversed;
  const panelBackgroundColor = model.background_color || backgroundColor;
  if (panelBackgroundColor) {
    style.backgroundColor = panelBackgroundColor;
    reversed = color(panelBackgroundColor).luminosity() < 0.45;
  }
  let markdown;
  let markdownCss = '';

  if (model.markdown) {
    const markdownSource = replaceVars(
      model.markdown,
      {},
      {
        _all: variables,
        ...variables
      }
    );

    if (model.markdown_css) {
      markdownCss = model.markdown_css
        .replace(new RegExp(getMarkdownId(model.id), 'g'), markdownElementId);
    }

    let className = 'tvbMarkdown';
    let contentClassName = `tvbMarkdown__content ${model.markdown_vertical_align}`;
    if (model.markdown_scrollbars) contentClassName += ' scrolling';
    if (reversed) className += ' reversed';
    const markdownError = markdownSource instanceof Error ? markdownSource : null;
    markdown = (
      <div className={className} data-test-subj="tsvbMarkdown">
        {markdownError && <ErrorComponent error={markdownError} />}
        <style type="text/css">{markdownCss}</style>
        <div className={contentClassName}>
          <div id={markdownElementId}>{!markdownError && <Markdown escapeHtml={true} source={markdownSource} />}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="tvbVis" style={style}>
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
  visData: PropTypes.object,
  dateFormat: PropTypes.string,
  getConfig: PropTypes.func
};

export default MarkdownVisualization;
