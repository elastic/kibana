import { Element } from '../element';
import header from './header.png';

export default new Element('markdown', {
  displayName: 'Markdown',
  description: 'Markup from Markdown',
  image: header,
  expression: 'markdown ""',
  render(domNode, config, done) {
    domNode.innerHTML = config.markup;
    done();
  },
});
