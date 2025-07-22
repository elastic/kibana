/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmpty,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextExtra } from '../types';
import { AddRowPanel } from './add_row_panel';
import { AddColumnPanel } from './add_column_panel';

type ToggleMode = 'add-row' | 'add-column';

export const RowColumnCreator = () => {
  const [activeMode, setActiveMode] = useState<ToggleMode | null>(null);
  const { euiTheme } = useEuiTheme();
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const isIndexCreated = useObservable(indexUpdateService.indexCreated$);

  const toggleAddRow = () => {
    if (isIndexCreated) {
      setActiveMode('add-row');
    } else {
      indexUpdateService.addEmptyRow();
    }
  };

  const toggleAddColumn = () => {
    setActiveMode('add-column');
  };

  const hidePanel = () => {
    setActiveMode(null);
  };

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={toggleAddRow}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-row'}
          >
            <FormattedMessage defaultMessage="Add row" id="indexEditor.addRow" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={toggleAddColumn}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-column'}
          >
            <FormattedMessage defaultMessage="Add field" id="indexEditor.addColumn" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {activeMode && (
        <EuiPanel
          paddingSize="s"
          css={{
            background: euiTheme.colors.backgroundBaseSubdued,
            marginBottom: euiTheme.size.xs,
          }}
        >
          {activeMode === 'add-row' && <AddRowPanel onHide={hidePanel} />}
          {activeMode === 'add-column' && <AddColumnPanel onHide={hidePanel} />}
        </EuiPanel>
      )}
    </>
  );
};
