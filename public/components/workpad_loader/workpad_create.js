import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton } from '@elastic/eui';

export const WorkpadCreate = ({ createPending, onCreate }) => (
  <EuiButton iconType="plusInCircle" size="s" fill onClick={onCreate} isLoading={createPending}>
    Create workpad
  </EuiButton>
);

WorkpadCreate.propTypes = {
  onCreate: PropTypes.func.isRequired,
  createPending: PropTypes.bool,
};
