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
import {
  RowControlColumn,
  RowControlComponent,
  RowControlProps,
  RowControlRowProps,
} from './types';
import { LogDocument } from '../../data_types';
import { getStacktraceFields } from '../../utils/get_stack_trace_fields';

/**
 * Stacktrace control factory function.
 * @param props Optional props for the generated Control component, useful to override onClick, etc
 */
export const createStacktraceControl = (props?: Partial<RowControlProps>): RowControlColumn => ({
  id: 'connectedStacktraceDocs',
  headerAriaLabel: actionsHeaderAriaLabelStacktraceAction,
  renderControl: (Control, rowProps) => {
    return <Stacktrace Control={Control} rowProps={rowProps} {...props} />;
  },
});

const actionsHeaderAriaLabelStacktraceAction = i18n.translate(
  'discover.customControl.stacktraceArialLabel',
  { defaultMessage: 'Access to available stacktraces' }
);

const stacktraceAvailableControlButton = i18n.translate(
  'discover.customControl.stacktrace.available',
  { defaultMessage: 'Stacktraces available' }
);

const stacktraceNotAvailableControlButton = i18n.translate(
  'discover.customControl.stacktrace.notAvailable',
  { defaultMessage: 'Stacktraces not available' }
);

const Stacktrace = ({
  Control,
  rowProps: { record },
  ...props
}: {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
} & Partial<RowControlProps>) => {
  const stacktrace = getStacktraceFields(record as LogDocument);
  const hasValue = Object.values(stacktrace).some(Boolean);

  return hasValue ? (
    <Control
      data-test-subj="docTableStacktraceExist"
      label={stacktraceAvailableControlButton}
      tooltipContent={stacktraceAvailableControlButton}
      iconType="apmTrace"
      onClick={undefined}
      {...props}
    />
  ) : (
    <Control
      disabled
      data-test-subj="docTableStacktraceDoesNotExist"
      label={stacktraceNotAvailableControlButton}
      tooltipContent={stacktraceNotAvailableControlButton}
      iconType="apmTrace"
      onClick={undefined}
      {...props}
    />
  );
};
