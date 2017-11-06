import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiContextMenuItem,
} from 'ui_framework/components';

export function DeleteMenuItem({ onDeletePanel }) {
  return (
    <KuiContextMenuItem
      data-test-subj="dashboardPanelRemoveIcon"
      onClick={onDeletePanel}
      icon={(
        <span
          aria-hidden="true"
          className="kuiButton__icon kuiIcon fa-trash"
        />
      )}
    >
      Delete from dashboard
    </KuiContextMenuItem>
  );
}

DeleteMenuItem.propTypes = {
  onDeletePanel: PropTypes.func.isRequired
};
