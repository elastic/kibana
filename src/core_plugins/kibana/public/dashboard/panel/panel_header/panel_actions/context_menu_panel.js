export class ContextMenuPanel {
  constructor({ actions, id, title, content }) {
    this.actions = actions;
    this.id = id;
    this.title = title;
    this.content = content;
  }

  getContent() { return this.content; }
}
