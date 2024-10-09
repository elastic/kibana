/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';
import { EuiButton, EuiButtonIcon, EuiCode, EuiPopover, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  RowControlColumn,
  RowControlComponent,
  RowControlProps,
  RowControlRowProps,
} from './types';
import { DEGRADED_DOCS_FIELDS } from '../../field_constants';

interface DegradedDocsControlProps extends Partial<RowControlProps> {
  enabled?: boolean;
  addIgnoredMetadataToQuery?: () => void;
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

const updateEsqlQuery = i18n.translate('discover.customControl.degradedDoc.updateEsqlQuery', {
  defaultMessage: 'Update ES|QL query',
});

const formattedCTAMessage = (
  <FormattedMessage
    id="discover.customControl.degradedDocDisabled"
    defaultMessage="Degraded document field detection is disabled for this search. To enable it, add {directive} to your ES|QL query."
    values={{
      directive: <EuiCode css={{ display: 'inline-block' }}>METADATA _ignored</EuiCode>,
    }}
  />
);

const DegradedDocs = ({
  Control,
  enabled = true,
  addIgnoredMetadataToQuery,
  rowProps: { record },
  ...props
}: {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
} & DegradedDocsControlProps) => {
  const isDegradedDocumentExists = DEGRADED_DOCS_FIELDS.some(
    (field) => field in record.raw && record.raw[field] !== null && record.raw[field] !== undefined
  );

  if (!enabled) {
    if (addIgnoredMetadataToQuery) {
      return (
        <EnableESQLDegradedDocsControl addIgnoredMetadataToQuery={addIgnoredMetadataToQuery} />
      );
    } else {
      return (
        <Control
          disabled
          data-test-subj="docTableDegradedDocDisabled"
          tooltipContent={formattedCTAMessage}
          label={actionsHeaderAriaLabelDegradedAction}
          iconType="indexClose"
          onClick={undefined}
          {...props}
        />
      );
    }
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

const EnableESQLDegradedDocsControl = ({
  addIgnoredMetadataToQuery,
}: Pick<DegradedDocsControlProps, 'addIgnoredMetadataToQuery'>) => {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  return (
    <EuiPopover
      anchorPosition="upCenter"
      button={
        <EuiButtonIcon
          aria-label={actionsHeaderAriaLabelDegradedAction}
          color="text"
          data-test-subj="docTableDegradedDocDisabled"
          iconSize="s"
          iconType="indexClose"
          onClick={togglePopover}
        />
      }
      closePopover={closePopover}
      isOpen={isPopoverOpen}
    >
      <EuiText
        component="p"
        size="s"
        style={{ marginBottom: euiThemeVars.euiSizeM, width: '30ch' }}
      >
        {formattedCTAMessage}
      </EuiText>
      <EuiButton
        fullWidth
        iconSide="right"
        iconType="push"
        onClick={addIgnoredMetadataToQuery}
        size="s"
      >
        {updateEsqlQuery}
      </EuiButton>
    </EuiPopover>
  );
};
