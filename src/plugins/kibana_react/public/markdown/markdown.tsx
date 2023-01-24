/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useEffect } from 'react';
import MarkdownIt from 'markdown-it';
import { memoize } from 'lodash';
import { getSecureRelForTarget } from '@elastic/eui';

import './index.scss';
/**
 * Return a memoized markdown rendering function that use the specified
 * whiteListedRules and openLinksInNewTab configurations.
 * @param {Array of Strings} whiteListedRules - white list of markdown rules
 * list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
 * @param {Boolean} openLinksInNewTab
 * @return {Function} Returns an Object to use with dangerouslySetInnerHTML
 * with the rendered markdown HTML
 */
export const markdownFactory = memoize(
  (whiteListedRules: string[] = [], openLinksInNewTab: boolean = false) => {
    let markdownIt: MarkdownIt;

    // It is imperative that the html config property be set to false, to mitigate XSS: the output of markdown-it is
    // fed directly to the DOM via React's dangerouslySetInnerHTML below.

    if (whiteListedRules && whiteListedRules.length > 0) {
      markdownIt = new MarkdownIt('zero', { html: false, linkify: true });
      markdownIt.enable(whiteListedRules);
    } else {
      markdownIt = new MarkdownIt({ html: false, linkify: true });
    }

    if (openLinksInNewTab) {
      // All links should open in new browser tab.
      // Define custom renderer to add 'target' attribute
      // https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
      const originalLinkRender =
        markdownIt.renderer.rules.link_open ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };
      markdownIt.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        const href = tokens[idx].attrGet('href');
        const target = '_blank';
        const rel = getSecureRelForTarget({ href: href === null ? undefined : href, target });

        // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
        tokens[idx].attrPush(['target', target]);
        if (rel) {
          tokens[idx].attrPush(['rel', rel]);
        }
        return originalLinkRender(tokens, idx, options, env, self);
      };
    }
    /**
     * This method is used to render markdown from the passed parameter
     * into HTML. It will just return an empty string when the markdown is empty.
     * @param {String} markdown - The markdown String
     * @return {String} - Returns the rendered HTML as string.
     */
    return (markdown: string) => {
      return markdown ? markdownIt.render(markdown) : '';
    };
  },
  (whiteListedRules: string[] = [], openLinksInNewTab: boolean = false) => {
    return `${whiteListedRules.join('_')}${openLinksInNewTab}`;
  }
);

export interface MarkdownProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  markdown?: string;
  openLinksInNewTab?: boolean;
  whiteListedRules?: string[];
  onRender?: () => void;
}

export const Markdown = (props: MarkdownProps) => {
  useEffect(() => {
    props.onRender?.();
  }, [props]);

  const { className, markdown = '', openLinksInNewTab, whiteListedRules, ...rest } = props;
  const classes = classNames('kbnMarkdown__body', className);
  const markdownRenderer = markdownFactory(whiteListedRules, openLinksInNewTab);
  const renderedMarkdown = markdownRenderer(markdown);
  return (
    <div
      {...rest}
      className={classes}
      /*
       * Justification for dangerouslySetInnerHTML:
       * The Markdown Visualization is, believe it or not, responsible for rendering Markdown.
       * This relies on `markdown-it` to produce safe and correct HTML.
       */
      dangerouslySetInnerHTML={{ __html: renderedMarkdown }} // eslint-disable-line react/no-danger
    />
  );
};

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default Markdown;
