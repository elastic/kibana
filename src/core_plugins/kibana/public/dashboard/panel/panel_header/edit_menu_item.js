import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiContextMenuItem,
} from 'ui_framework/components';

export function EditMenuItem({ onEditPanel }) {
  return (
    <KuiContextMenuItem
      data-test-subj="dashboardPanelEditLink"
      onClick={onEditPanel}
      icon={(
        <span
          aria-hidden="true"
          className="kuiButton__icon kuiIcon fa-edit"
        />
      )}
    >
      Edit Visualization
    </KuiContextMenuItem>
  );
}

EditMenuItem.propTypes = {
  onEditPanel: PropTypes.func.isRequired
};
