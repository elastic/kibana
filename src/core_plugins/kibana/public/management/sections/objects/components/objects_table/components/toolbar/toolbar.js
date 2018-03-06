import React from 'react';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiButton,
} from '@elastic/eui';

export const Toolbar = ({
  onSearchChanged,
  searchQuery
}) => {
  return (
    <EuiFlexGrid>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={7}>
          <EuiFieldSearch
            fullWidth
            placeholder="Search"
            onChange={e => onSearchChanged(e.target.value)}
            value={searchQuery}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton iconType="trash" size="s">
                Delete
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s">
                Export
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGrid>
  );
};
