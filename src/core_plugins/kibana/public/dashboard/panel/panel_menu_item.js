import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiMenuItem } from 'ui_framework/components';

export function PanelMenuItem({ iconClass, onClick, label, ...props }) {
  const iconClasses = classNames('kuiButton__icon kuiIcon', iconClass);
  return (
    <KuiMenuItem
      className="dashboardPanelMenuItem"
      onClick={onClick}
      {...props}
    >
      <span
        aria-hidden="true"
        className={iconClasses}
      />
      <p className="kuiText">{label}</p>
    </KuiMenuItem>
  );
}

PanelMenuItem.propTypes = {
  iconClass: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired
};
