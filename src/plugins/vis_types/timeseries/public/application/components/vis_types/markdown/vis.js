/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import { get } from 'lodash';
import { ClassNames } from '@emotion/react';
import { Markdown } from '@kbn/kibana-react-plugin/public';

import { ErrorComponent } from '../../error';
import { replaceVars } from '../../lib/replace_vars';
import { convertSeriesToVars } from '../../lib/convert_series_to_vars';
import { isBackgroundInverted } from '../../../lib/set_is_reversed';

function MarkdownVisualization(props) {
  const { backgroundColor, model, visData, getConfig, fieldFormatMap } = props;
  const series = get(visData, `${model.id}.series`, []);
  const variables = convertSeriesToVars(series, model, getConfig, fieldFormatMap);

  const panelBackgroundColor = model.background_color || backgroundColor;
  const style = { backgroundColor: panelBackgroundColor };

  let markdown;

  if (model.markdown) {
    const markdownSource = replaceVars(
      model.markdown,
      {},
      {
        _all: variables,
        ...variables,
      }
    );

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
        <ClassNames>
          {({ css, cx }) => (
            <div className={cx(contentClasses, css(model.markdown_css))}>
              <div>
                {!markdownError && (
                  <Markdown
                    markdown={markdownSource}
                    openLinksInNewTab={model.markdown_openLinksInNewTab}
                  />
                )}
              </div>
            </div>
          )}
        </ClassNames>
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
  onFilterClick: PropTypes.func,
  onChange: PropTypes.func,
  visData: PropTypes.object,
  getConfig: PropTypes.func,
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MarkdownVisualization as default };
