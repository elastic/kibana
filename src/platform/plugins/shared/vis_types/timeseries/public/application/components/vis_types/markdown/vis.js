/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import classNames from 'classnames';
import { get } from 'lodash';
import { ClassNames, css } from '@emotion/react';
import { Markdown } from '@kbn/kibana-react-plugin/public';

import { ErrorComponent } from '../../error';
import { replaceVars } from '../../lib/replace_vars';
import { convertSeriesToVars } from '../../lib/convert_series_to_vars';
import { isBackgroundInverted } from '../../../lib/set_is_reversed';
import { visStyles } from '../_vis_types';

const markdownStyles = css`
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  position: relative;
`;

const markdownContentStyles = css`
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;

  &.tvbMarkdown__content--middle {
    justify-content: center;
  }

  &.tvbMarkdown__content--bottom {
    justify-content: flex-end;
  }

  &.tvbMarkdown__content-isScrolling {
    overflow: auto;
  }
`;

function MarkdownVisualization(props) {
  const {
    backgroundColor,
    model,
    visData,
    getConfig,
    fieldFormatMap,
    initialRender,
    indexPattern,
  } = props;
  const series = get(visData, `${model.id}.series`, []);
  const variables = convertSeriesToVars(series, model, getConfig, fieldFormatMap, indexPattern);

  const panelBackgroundColor = model.background_color || backgroundColor;
  const style = { backgroundColor: panelBackgroundColor };

  const isReversed = useMemo(
    () => isBackgroundInverted(panelBackgroundColor),
    [panelBackgroundColor]
  );

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

    const contentClasses = classNames(
      'eui-scrollBar',
      'tvbMarkdown__content',
      `tvbMarkdown__content--${model.markdown_vertical_align}`,
      { 'tvbMarkdown__content-isScrolling': model.markdown_scrollbars }
    );

    const markdownError = markdownSource instanceof Error ? markdownSource : null;

    markdown = (
      <div className="tvbMarkdown" css={markdownStyles} data-test-subj="tsvbMarkdown">
        {markdownError && <ErrorComponent error={markdownError} />}
        <ClassNames>
          {({ css, cx }) => (
            <div
              className={cx(
                contentClasses,
                // wrapping select for markdown body to make sure selector specificity wins over base styles
                css(
                  [
                    `.kbnMarkdown__body {
                      ${model.markdown_css}
                    }`,
                  ],
                  markdownContentStyles
                )
              )}
            >
              <div>
                {!markdownError && (
                  <Markdown
                    isReversed={isReversed}
                    onRender={initialRender}
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
    <div className="tvbVis" css={visStyles} style={style}>
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
