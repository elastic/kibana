export class DashboardContextMenuPanel {
  /**
   * @param {string} id
   * @param {string} title
   * @param {function} getContent
   */
  constructor({ id, title, getContent }) {
    this.id = id;
    this.title = title;

    if (getContent) {
      this.getContent = getContent;
    }
  }

  /**
   * Optional, could be composed of actions instead of content.
   * @param {Embeddable} embeddable
   * @param {ContainerState} containerState
   */
  getContent(/*{ embeddable, containerState }*/) {
    return null;
  }
}
