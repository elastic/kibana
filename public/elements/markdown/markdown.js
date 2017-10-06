import { Element } from '../element';
import header from './header.png';
import Markdown from 'markdown-it';
import ReactDOM from 'react-dom';
import React from 'react';
import './markdown.less';

const md = new Markdown();


export default new Element('markdown', {
  displayName: 'Markdown',
  description: 'Markup from Markdown',
  image: header,
  expression: `filters | demodata | markdown "### Welcome to the Markdown Element.

Good news! You're already connected to some demo data!

The datatable contains
**{{rows.length}} rows**, each containing
 the following columns:
{{#each columns}}
 **{{name}}**
{{/each}}

You can use standard Markdown in here, but you can also access your piped-in data using Handlebars. If you want to know more, check out the [Handlebars Documentation](http://handlebarsjs.com/expressions.html)

#### Enjoy!"`,
  render(domNode, config, handlers) {
    const html = { __html: md.render(String(config.content)) };
    const fontStyle = config.font ? config.font.spec : {};

    ReactDOM.render((
      <div
        className="canvas__element__markdown"
        style={fontStyle}
        dangerouslySetInnerHTML={html}/>
    ), domNode);
    handlers.done();
  },
});
