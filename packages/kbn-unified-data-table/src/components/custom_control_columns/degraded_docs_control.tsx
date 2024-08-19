/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { DEGRADED_DOCS_FIELD } from '@kbn/discover-utils/src/field_constants';
import {
  RowControlColumn,
  RowControlComponent,
  RowControlProps,
  RowControlRowProps,
} from '../../types';

/**
 * Degraded docs control factory function.
 * @param props Optional props for the generated Control component, useful to override onClick, etc
 */
export const createDegradedDocsControl = (props?: Partial<RowControlProps>): RowControlColumn => ({
  id: 'connectedDegradedDocs',
  headerAriaLabel: actionsHeaderAriaLabelDegradedAction,
  renderControl: (Control, rowProps) => {
    return <DegradedDocs Control={Control} rowProps={rowProps} {...props} />;
  },
});

const actionsHeaderAriaLabelDegradedAction = i18n.translate(
  'unifiedDataTable.grid.additionalRowActions.degradedDocArialLabel',
  { defaultMessage: 'Access to degraded docs' }
);

const degradedDocButtonLabelWhenPresent = i18n.translate(
  'unifiedDataTable.grid.additionalRowActions.degradedDocPresent',
  {
    defaultMessage:
      "This document couldn't be parsed correctly. Not all fields are properly populated",
  }
);

const degradedDocButtonLabelWhenNotPresent = i18n.translate(
  'unifiedDataTable.grid.additionalRowActions.degradedDocNotPresent',
  { defaultMessage: 'All fields in this document were parsed correctly' }
);

const DegradedDocs = ({
  Control,
  rowProps: { record },
  ...props
}: {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
}) => {
  const isDegradedDocumentExists = DEGRADED_DOCS_FIELD in record.raw;

  return isDegradedDocumentExists ? (
    <Control
      data-test-subj="docTableDegradedDocExist"
      color="danger"
      label={degradedDocButtonLabelWhenPresent}
      iconType="indexClose"
      onClick={undefined}
      {...props}
    />
  ) : (
    <Control
      data-test-subj="docTableDegradedDocDoesNotExist"
      color="text"
      label={degradedDocButtonLabelWhenNotPresent}
      iconType="indexClose"
      onClick={undefined}
      {...props}
    />
  );
};
