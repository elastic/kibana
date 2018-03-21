import React from 'react';
import PropTypes from 'prop-types';
import { Markdown } from 'ui/markdown/markdown';

const whiteListedRules = ['backticks', 'emphasis', 'link', 'list'];

export function Content({ text }) {
  return (
    <Markdown
      className="euiText euiTextColor--subdued tutorialContent"
      markdown={text}
      openLinksInNewTab={true}
      whiteListedRules={whiteListedRules}
    />
  );
}

Content.propTypes = {
  text: PropTypes.string.isRequired
};
