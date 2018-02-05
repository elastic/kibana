import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import MarkdownIt from 'markdown-it';

const markdownIt = new MarkdownIt('zero', { html: false, linkify: true });
// list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
markdownIt.enable(['backticks', 'emphasis', 'link', 'list']);

// All links should open in new browser tab.
// Define custom renderer to add 'target' attribute
// https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
const originalLinkRender = markdownIt.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};
markdownIt.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  tokens[idx].attrPush(['target', '_blank']);
  // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
  tokens[idx].attrPush(['rel', 'noopener noreferrer']);
  return originalLinkRender(tokens, idx, options, env, self);
};

export function Content({ className, text }) {
  const classes = classNames('euiText euiTextColor--subdued tutorialContent markdown-body', className);
  return (
    <div
      className={classes}
      dangerouslySetInnerHTML={{ __html: markdownIt.render(text) }}
    />
  );
}

Content.propTypes = {
  className: PropTypes.string,
  text: PropTypes.string.isRequired
};
