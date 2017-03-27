/**
 * Part of the exposed plugin API - do not remove without careful consideration.
 * @type {boolean}
 */
let hideDashboardWriteControls = false;

export function getHideWriteControls() {
  return hideDashboardWriteControls;
}

export function turnHideWriteControlsOn() {
  hideDashboardWriteControls = true;
}
