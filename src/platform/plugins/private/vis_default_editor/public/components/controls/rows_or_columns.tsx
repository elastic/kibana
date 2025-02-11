/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiButtonGroup, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggControlProps } from './agg_control_props';

const PARAMS = {
  NAME: 'row',
  ROWS: 'visEditorSplitBy__true',
  COLUMNS: 'visEditorSplitBy__false',
};

function RowsOrColumnsControl({ editorStateParams, setStateParamValue }: AggControlProps) {
  if (editorStateParams.row === undefined) {
    setStateParamValue(PARAMS.NAME, true);
  }
  const idSelected = `visEditorSplitBy__${editorStateParams.row}`;
  const options = [
    {
      id: PARAMS.ROWS,
      label: i18n.translate('visDefaultEditor.controls.rowsLabel', {
        defaultMessage: 'Rows',
      }),
      'data-test-subj': 'visEditorSplitBy-Rows',
    },
    {
      id: PARAMS.COLUMNS,
      label: i18n.translate('visDefaultEditor.controls.columnsLabel', {
        defaultMessage: 'Columns',
      }),
      'data-test-subj': 'visEditorSplitBy-Columns',
    },
  ];
  const onChange = useCallback(
    (optionId: string) => setStateParamValue(PARAMS.NAME, optionId === PARAMS.ROWS),
    [setStateParamValue]
  );

  return (
    <>
      <EuiFormRow display="rowCompressed" fullWidth={true}>
        <EuiButtonGroup
          data-test-subj="visEditorSplitBy"
          legend={i18n.translate('visDefaultEditor.controls.splitByLegend', {
            defaultMessage: 'Split chart by rows or columns.',
          })}
          options={options}
          isFullWidth={true}
          idSelected={idSelected}
          onChange={onChange}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
}

export { RowsOrColumnsControl };
