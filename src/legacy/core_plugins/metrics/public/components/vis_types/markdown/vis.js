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
import classNames from 'classnames';
import uuid from 'uuid';
import { get } from 'lodash';
import { Markdown } from 'ui/markdown/markdown';

import { ErrorComponent } from '../../error';
import { replaceVars } from '../../lib/replace_vars';
import { convertSeriesToVars } from '../../lib/convert_series_to_vars';
import { isBackgroundInverted } from '../../../../common/set_is_reversed';

const getMarkdownId = id => `markdown-${id}`;

export function MarkdownVisualization(props) {
  const { backgroundColor, model, visData, dateFormat } = props;
  const series = get(visData, `${model.id}.series`, []);
  const variables = convertSeriesToVars(series, model, dateFormat, props.getConfig);
  const markdownElementId = getMarkdownId(uuid.v1());

  const panelBackgroundColor = model.background_color || backgroundColor;
  const style = { backgroundColor: panelBackgroundColor };

  let markdown;
  let markdownCss = '';

  if (model.markdown) {
    const markdownSource = replaceVars(
      model.markdown,
      {},
      {
        _all: variables,
        ...variables,
      }
    );

    if (model.markdown_css) {
      markdownCss = model.markdown_css.replace(
        new RegExp(getMarkdownId(model.id), 'g'),
        markdownElementId
      );
    }

    const markdownClasses = classNames('kbnMarkdown__body', {
      'kbnMarkdown__body--reversed': isBackgroundInverted(panelBackgroundColor),
    });

    const contentClasses = classNames(
      'tvbMarkdown__content',
      `tvbMarkdown__content--${model.markdown_vertical_align}`,
      { 'tvbMarkdown__content-isScrolling': model.markdown_scrollbars },
      markdownClasses
    );

    const markdownError = markdownSource instanceof Error ? markdownSource : null;

    markdown = (
      <div className="tvbMarkdown" data-test-subj="tsvbMarkdown">
        {markdownError && <ErrorComponent error={markdownError} />}
        <style type="text/css">{markdownCss}</style>
        <div className={contentClasses}>
          <div id={markdownElementId}>
            {!markdownError && (
              <Markdown
                markdown={markdownSource}
                openLinksInNewTab={model.markdown_openLinksInNewTab}
              />
            )}
          </div>
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
  visData: PropTypes.object,
  dateFormat: PropTypes.string,
  getConfig: PropTypes.func,
};
