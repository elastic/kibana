import React from 'react';
import ReactDOM from 'react-dom';
import Markdown from 'markdown-it';
import './markdown.less';

const md = new Markdown();

export const markdown = {
  name: 'markdown',
  displayName: 'Markdown',
  help: 'Render HTML Markup using Markdown input',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const html = { __html: md.render(String(config.content)) };
    const fontStyle = config.font ? config.font.spec : {};

    ReactDOM.render((
      <div
        className="canvas__element__markdown"
        style={fontStyle}
        dangerouslySetInnerHTML={html}/>
    ), domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
};
