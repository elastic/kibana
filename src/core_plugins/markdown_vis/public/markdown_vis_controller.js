import MarkdownIt from 'markdown-it';
import React from 'react';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

export function MarkdownVisComponent(props) {
  const visParams = props.vis.params;
  return (
    <div className="markdown-vis">
      <div
        className="markdown-body"
        data-test-subj="markdownBody"
        style={{ fontSize: `${visParams.fontSize}pt` }}
        dangerouslySetInnerHTML={{ __html: markdownIt.render(visParams.markdown || '') }}
      />
    </div>
  );
}
