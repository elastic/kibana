/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { type RefObject } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EuiDataGridRefProps } from '@kbn/unified-data-table';
import useObservable from 'react-use/lib/useObservable';
import type { KibanaContextExtra } from '../types';

export const RowColumnCreator = ({
  dataTableRef,
}: {
  dataTableRef: RefObject<EuiDataGridRefProps>;
}) => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const columns = useObservable(indexUpdateService.dataTableColumns$);

  const addRow = () => {
    indexUpdateService.addEmptyRow();

    requestAnimationFrame(() => {
      // Focus needs to be changed if it was set on the cell before for it to work.
      dataTableRef.current?.setFocusedCell({ rowIndex: 0, colIndex: 0 });
      dataTableRef.current?.setFocusedCell({ rowIndex: 0, colIndex: 1 });
    });
  };

  const addColumn = () => {
    indexUpdateService.addNewColumn();

    requestAnimationFrame(() => {
      if (columns?.length && dataTableRef.current?.scrollToItem) {
        dataTableRef.current.scrollToItem({ columnIndex: columns?.length + 1, align: 'smart' });
      }
    });
  };

  return (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="indexEditorAddRowButton"
          onClick={addRow}
          iconType="plusInCircle"
          size="s"
          disabled={indexUpdateService.canEditIndex === false}
        >
          <EuiText size="xs">
            <FormattedMessage defaultMessage="Add row" id="indexEditor.addRow" />
          </EuiText>
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="indexEditorAddColumnButton"
          onClick={addColumn}
          iconType="plusInCircle"
          size="s"
          disabled={indexUpdateService.canEditIndex === false}
        >
          <EuiText size="xs">
            <FormattedMessage defaultMessage="Add column" id="indexEditor.addColumn" />
          </EuiText>
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
