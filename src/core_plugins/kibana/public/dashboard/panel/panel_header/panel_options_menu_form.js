import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiButton,
} from 'ui_framework/components';

export function PanelOptionsMenuForm({ title, onReset, onUpdatePanelTitle }) {
  function onInputChange(event) {
    onUpdatePanelTitle(event.target.value);
  }
  return (
    <div
      data-test-subj="dashboardPanelTitleInputMenuItem"
    >
      <label className="kuiFormLabel" htmlFor="panelTitleInput">Panel title</label>
      <input
        id="panelTitleInput"
        name="min"
        type="text"
        className="kuiTextInput"
        value={title}
        onChange={onInputChange}
      />
      <KuiButton
        buttonType="basic"
        onClick={onReset}
        aria-label="Reset panel title"
        icon={
          <span
            aria-hidden="true"
            className="kuiButton__icon kuiIcon fa-undo"
          />
       }
      />
    </div>
  );
}

PanelOptionsMenuForm.propTypes = {
  title: PropTypes.string,
  onUpdatePanelTitle: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};
