import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton } from '@elastic/eui';

export const WorkpadCreate = ({ createPending, onCreate }) => (
  <EuiButton
    fill
    onClick={onCreate}
    isLoading={createPending}
    iconType={!createPending ? 'plusInCircle' : null}
  >
    Create Workpad
  </EuiButton>
);

WorkpadCreate.propTypes = {
  onCreate: PropTypes.func.isRequired,
  createPending: PropTypes.bool,
};
