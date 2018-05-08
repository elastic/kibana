export class DashboardContextMenuPanel {
  /**
   * @param {Array.<DashboardPanelAction>} actions
   * @param {string} id
   * @param {string} title
   * @param {function} getContent
   */
  constructor({ actions, id, title, getContent }) {
    this.actions = actions;
    this.id = id;
    this.title = title;
    this.getContent = getContent;
  }

  /**
   * @param {Embeddable} embeddable
   * @param containerState
   */
  getContent(/*embeddable, containerState*/) {
    throw new Error('Must implement getContent');
  }
}
