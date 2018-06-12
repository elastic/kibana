import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiButton,
} from 'ui_framework/components';

import {
  keyCodes,
} from 'ui_framework/services';

export function PanelOptionsMenuForm({ title, customDashboardLink, onReset, onUpdatePanelTitle, onUpdatePanelCustomDashboardLink, onClose }) {
  function onTitleInputChange(event) {
    onUpdatePanelTitle(event.target.value);
  }

  function onCustomDashboardLinkInputChange(event) {
    onUpdatePanelCustomDashboardLink(event.target.value);
  }

  function onKeyDown(event) {
    if (event.keyCode === keyCodes.ENTER) {
      onClose();
    }
  }

  return (
    <div
      className="kuiVerticalRhythm dashboardPanelMenuOptionsForm"
      data-test-subj="dashboardPanelTitleInputMenuItem"
    >
      <label className="kuiFormLabel" htmlFor="panelTitleInput">Panel title</label>
      <input
        id="panelTitleInput"
        name="min"
        type="text"
        className="kuiTextInput"
        value={title}
        onChange={onTitleInputChange}
        onKeyDown={onKeyDown}
      />
      <KuiButton
        buttonType="hollow"
        onClick={onReset}
      >
        Reset title
      </KuiButton>

      <label className="kuiFormLabel" htmlFor="panelCustomDashboardLinkInput">Custom Dashboard Link</label>
      <input
        id="panelCustomDashboardLinkInput"
        name="min"
        type="text"
        className="kuiTextInput"
        value={customDashboardLink}
        onChange={onCustomDashboardLinkInputChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

PanelOptionsMenuForm.propTypes = {
  title: PropTypes.string,
  customDashboardLink: PropTypes.string,
  onUpdatePanelTitle: PropTypes.func.isRequired,
  onUpdatePanelCustomDashboardLink: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
