import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import MarkdownIt from 'markdown-it';

const markdownIt = new MarkdownIt('zero', { html: false, linkify: true });
// list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
markdownIt.enable(['backticks', 'emphasis', 'link', 'list']);

export function Content({ className, text }) {
  const classes = classNames('kuiText kuiSubduedText tutorialContent markdown-body', className);
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
