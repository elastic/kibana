/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import uuid from 'uuid';
import { get } from 'lodash';
import { Markdown } from '../../../../../../../plugins/kibana_react/public';

import { ErrorComponent } from '../../error';
import { replaceVars } from '../../lib/replace_vars';
import { convertSeriesToVars } from '../../lib/convert_series_to_vars';
import { isBackgroundInverted } from '../../../lib/set_is_reversed';

const getMarkdownId = (id) => `markdown-${id}`;

function MarkdownVisualization(props) {
  const { backgroundColor, model, visData, getConfig } = props;
  const series = get(visData, `${model.id}.series`, []);
  const variables = convertSeriesToVars(series, model, getConfig('dateFormat'), props.getConfig);
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
  getConfig: PropTypes.func,
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MarkdownVisualization as default };
