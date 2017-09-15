import { Element } from '../element';
import header from './header.png';
import Markdown from 'markdown-it';

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
    domNode.innerHTML = md.render(config.content);
    Object.assign(domNode.style, config.font.spec);
    $('h1, h2, h3, h4, h5, h6', domNode).css(config.font.spec);
    handlers.done();
  },
});
