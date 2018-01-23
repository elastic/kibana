import MarkdownIt from 'markdown-it';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

export class MarkdownVisController {
  _empty() {
    while (this._containerNode.firstChild) {
      this._containerNode.removeChild(this._containerNode.firstChild);
    }
  }

  constructor(node, vis) {
    this._vis = vis;
    this._containerNode = document.createElement('div');
    this._containerNode.className = 'markdown-vis';
    node.appendChild(this._containerNode);
  }

  async render(data, status) {
    if (status.params && this._vis.params.markdown) {
      const markdownElement = document.createElement('div');
      markdownElement.className = 'markdown-body';
      markdownElement.style['font-size'] = `${this._vis.params.fontSize}pt`;
      markdownElement.dataset.testSubj = 'markdownBody';
      markdownElement.innerHTML = markdownIt.render(this._vis.params.markdown);
      this._empty();
      this._containerNode.appendChild(markdownElement);
    }
  }

}
