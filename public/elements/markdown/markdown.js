import { Element } from '../element';
import header from './header.png';

export default new Element('markdown', {
  displayName: 'Markdown',
  description: 'Markup from Markdown',
  image: header,
  expression: 'markdown "Your Text Here"',
  render(domNode, config, handlers) {
    domNode.innerHTML = config.markup;
    handlers.done();
  },
});
