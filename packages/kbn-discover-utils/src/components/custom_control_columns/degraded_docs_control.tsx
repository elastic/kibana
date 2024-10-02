/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiCode, EuiSpacer } from '@elastic/eui';
import {
  RowControlColumn,
  RowControlComponent,
  RowControlProps,
  RowControlRowProps,
} from './types';
import { DEGRADED_DOCS_FIELDS } from '../../field_constants';

interface DegradedDocsControlProps extends Partial<RowControlProps> {
  enabled?: boolean;
}

/**
 * Degraded docs control factory function.
 * @param props Optional props for the generated Control component, useful to override onClick, etc
 */
export const createDegradedDocsControl = (props?: DegradedDocsControlProps): RowControlColumn => ({
  id: 'connectedDegradedDocs',
  headerAriaLabel: actionsHeaderAriaLabelDegradedAction,
  renderControl: (Control, rowProps) => {
    return <DegradedDocs Control={Control} rowProps={rowProps} {...props} />;
  },
});

const actionsHeaderAriaLabelDegradedAction = i18n.translate(
  'discover.customControl.degradedDocArialLabel',
  { defaultMessage: 'Access to degraded docs' }
);

const degradedDocButtonLabelWhenPresent = i18n.translate(
  'discover.customControl.degradedDocPresent',
  {
    defaultMessage:
      "This document couldn't be parsed correctly. Not all fields are properly populated.",
  }
);

const degradedDocButtonLabelWhenNotPresent = i18n.translate(
  'discover.customControl.degradedDocNotPresent',
  { defaultMessage: 'All fields in this document were parsed correctly' }
);

const degradedDocButtonLabelWhenDisabled = i18n.translate(
  'discover.customControl.degradedDocDisabled',
  {
    defaultMessage:
      'Degraded document field detection is currently disabled for this search. To enable it, include the METADATA directive for the `_ignored` field in your ES|QL query. For example:',
  }
);

const DegradedDocs = ({
  Control,
  enabled = true,
  rowProps: { record },
  ...props
}: {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
} & DegradedDocsControlProps) => {
  const isDegradedDocumentExists = DEGRADED_DOCS_FIELDS.some(
    (field) => field in record.raw && record.raw[field] !== null
  );

  if (!enabled) {
    const codeSample = 'FROM logs-* METADATA _ignored';

    const tooltipContent = (
      <div>
        {degradedDocButtonLabelWhenDisabled}
        <EuiSpacer size="s" />
        <EuiCode>{codeSample}</EuiCode>
      </div>
    );

    return (
      <Control
        disabled
        data-test-subj="docTableDegradedDocDisabled"
        tooltipContent={tooltipContent}
        label={`${degradedDocButtonLabelWhenDisabled} ${codeSample}`}
        iconType="indexClose"
        onClick={undefined}
        {...props}
      />
    );
  }

  return isDegradedDocumentExists ? (
    <Control
      data-test-subj="docTableDegradedDocExist"
      color="danger"
      tooltipContent={degradedDocButtonLabelWhenPresent}
      label={degradedDocButtonLabelWhenPresent}
      iconType="indexClose"
      onClick={undefined}
      {...props}
    />
  ) : (
    <Control
      data-test-subj="docTableDegradedDocDoesNotExist"
      color="text"
      tooltipContent={degradedDocButtonLabelWhenNotPresent}
      label={degradedDocButtonLabelWhenNotPresent}
      iconType="indexClose"
      onClick={undefined}
      {...props}
    />
  );
};
