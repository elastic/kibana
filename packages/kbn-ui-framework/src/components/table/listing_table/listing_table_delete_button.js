import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiButton,
  KuiButtonIcon,
} from '../../';

export function KuiListingTableDeleteButton({ onDelete, ...props }) {
  return (
    <KuiButton
      {...props}
      buttonType="danger"
      onClick={onDelete}
      icon={<KuiButtonIcon type="delete" />}
    />
  );
}

KuiListingTableDeleteButton.propTypes = {
  onDelete: PropTypes.func
};
