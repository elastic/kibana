import React, { Fragment } from 'react';

import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiButtonEmpty,
} from '@elastic/eui';

export const Header = ({
  onExportAll,
  onImport,
  onRefresh,
  totalCount,
}) => (
  <Fragment>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="baseline" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h1>Saved Objects</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">
              <p>{totalCount} in total</p>
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="baseline" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="exportAction"
              data-test-subj="exportAllObjects"
              onClick={onExportAll}
            >
              Export Everything
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="importAction"
              data-test-subj="importObjects"
              onClick={onImport}
            >
              Import
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="refresh"
              onClick={onRefresh}
            >
              Refresh
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m"/>
    <EuiText>
      <p>
        <EuiTextColor color="subdued">
          From here you can delete saved objects, such as saved searches.
          You can also edit the raw data of saved objects.
          Typically objects are only modified via their associated application,
          which is probably what you should use instead of this screen.
        </EuiTextColor>
      </p>
    </EuiText>
    <EuiSpacer size="m"/>
  </Fragment>
);
