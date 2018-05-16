export class DashboardContextMenuPanel {
  /**
   * @param {Array.<DashboardPanelAction>} actions
   * @param {string} id
   * @param {string} title
   * @param {function} getContent
   */
  constructor({ actions, id, title, getContent }) {
    this.actions = actions || [];
    this.id = id;
    this.title = title;

    if (getContent) {
      this.getContent = getContent;
    }
  }

  /**
   * Either actions or content should be specified.
   * @param {Embeddable} embeddable
   * @param {ContainerState} containerState
   */
  getContent(/*embeddable, containerState*/) {
    return null;
  }
}
