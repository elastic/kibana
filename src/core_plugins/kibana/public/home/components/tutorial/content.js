import React from 'react';
import PropTypes from 'prop-types';
import MarkdownIt from 'markdown-it';
import { replaceTemplateStrings } from './replace_template_strings';

const markdownIt = new MarkdownIt('zero', { html: false, linkify: true });
// list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
markdownIt.enable(['backticks', 'emphasis', 'link', 'list']);

export function Content({ text }) {
  return (
    <p
      className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall"
      dangerouslySetInnerHTML={{ __html: markdownIt.render(replaceTemplateStrings(text)) }}
    />
  );
}

Content.propTypes = {
  text: PropTypes.string.isRequired
};
