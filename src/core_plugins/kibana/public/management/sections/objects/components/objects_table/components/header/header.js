import React from 'react';

import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiButton,
} from '@elastic/eui';

export const Header = ({
  onExportAll,
  onImport,
  onRefresh,
}) => (
  <div>
    <EuiSpacer size="m"/>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h1>Edit Saved Objects</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="exportAction"
              onClick={onExportAll}
            >
              Export Everything
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="importAction"
              onClick={onImport}
            >
              Import
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="refresh"
              onClick={onRefresh}
            >
              Refresh
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s"/>
    <EuiText>
      <p>
        <EuiTextColor color="subdued">
          From here you can delete saved objects, such as saved searches.
          You can also edit the raw data of saved objects.
          Typically objects are only modified via their associated application,
          which is probably what you should use instead of this screen.
          Each tab is limited to 100 results.
          You can use the filter to find objects not in the default list.
        </EuiTextColor>
      </p>
    </EuiText>
    <EuiSpacer size="m"/>
  </div>
);
