import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiContextMenuItem,
} from 'ui_framework/components';

export function ExpandOrCollapseMenuItem({ onToggleExpand, isExpanded }) {
  return (
    <KuiContextMenuItem
      data-test-subj="dashboardPanelExpandIcon"
      onClick={onToggleExpand}
      icon={(
        <span
          aria-hidden="true"
          className={`kuiButton__icon kuiIcon ${isExpanded ? 'fa-compress' : 'fa-expand'}`}
        />
      )}
    >
      {isExpanded ? 'Minimize' : 'Full screen'}
    </KuiContextMenuItem>
  );
}

ExpandOrCollapseMenuItem.propTypes = {
  onToggleExpand: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
};
