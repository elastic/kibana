export class DashboardPanelAction {
  /**
   *
   * @param {string} id
   * @param {string} displayName
   * @param {function} onClick
   * @param {DashboardContextMenuPanel} childContextMenuPanel - optional child panel to open when clicked.
   * @param {function} disabled - optionally set a custom disabled function
   * @param {function} visible - optionally set a custom visible function
   * @param {string} parentPanelId - set if this action belongs on a nested child panel
   * @param {Element} icon
   */
  constructor(
    {
      id,
      displayName,
      onClick,
      childContextMenuPanel,
      disabled,
      visible,
      parentPanelId,
      icon,
    } = {}) {
    this.id = id;
    this.icon = icon;
    this.displayName = displayName;
    this.childContextMenuPanel = childContextMenuPanel;
    this.parentPanelId = parentPanelId;

    if (onClick) {
      this.onClick = onClick;
    }

    if (disabled) {
      this.disabled = disabled;
    }

    if (visible) {
      this.visible = visible;
    }
  }

  /**
   * @param {Embeddable} embeddable
   * @param containerState
   */
  onClick(/*embeddable, containerState*/) {}

  /**
   * Defaults to always visible.
   * @param {Embeddable} embeddable
   * @param containerState
   * @return {boolean}
   */
  isVisible(/*embeddable, containerState*/) {
    return true;
  }

  /**
   * Defaults to always enabled.
   * @param {Embeddable} embeddable
   * @param containerState
   */
  isDisabled(/*embeddable, containerState */) {
    return false;
  }
}
