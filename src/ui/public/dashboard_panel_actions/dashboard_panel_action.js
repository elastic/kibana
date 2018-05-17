export class DashboardPanelAction {
  /**
   *
   * @param {string} id
   * @param {string} displayName
   * @param {function} onClick
   * @param {DashboardContextMenuPanel} childContextMenuPanel - optional child panel to open when clicked.
   * @param {function} isDisabled - optionally set a custom disabled function
   * @param {function} isVisible - optionally set a custom isVisible function
   * @param {string} parentPanelId - set if this action belongs on a nested child panel
   * @param {Element} icon
   */
  constructor(
    {
      id,
      displayName,
      onClick,
      childContextMenuPanel,
      isDisabled,
      isVisible,
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

    if (isDisabled) {
      this.isDisabled = isDisabled;
    }

    if (isVisible) {
      this.isVisible = isVisible;
    }
  }

  /**
   * @param {Embeddable} embeddable
   * @param ContainerState} containerState
   */
  onClick(/*{ embeddable, containerState }*/) {}

  /**
   * Defaults to always visible.
   * @param {Embeddable} embeddable
   * @param ContainerState} containerState
   * @return {boolean}
   */
  isVisible(/*{ embeddable, containerState }*/) {
    return true;
  }

  /**
   * Defaults to always enabled.
   * @param {Embeddable} embeddable
   * @param {ContainerState} containerState
   */
  isDisabled(/*{ embeddable, containerState }*/) {
    return false;
  }
}
