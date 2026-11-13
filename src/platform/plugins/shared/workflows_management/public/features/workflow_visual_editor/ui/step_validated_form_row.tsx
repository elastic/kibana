/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFormRow, EuiIconTip, useEuiFontSize, useGeneratedHtmlId } from '@elastic/eui';
import React, { createContext, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { DESCRIPTION_MAX_LINES, useDescriptionOverflow } from './use_description_overflow';

/** The info icon of a moved description, for the slot a field's label leaves for it. */
const FieldDescriptionIconContext = createContext<React.ReactNode>(null);

/** At the end of a field's label, after its title, YAML key and "Optional". */
export function FieldDescriptionIconSlot() {
  const icon = useContext(FieldDescriptionIconContext);
  return icon ? <span css={{ display: 'inline-flex', alignSelf: 'center' }}>{icon}</span> : null;
}

/**
 * EuiFormRow wrapper that forbids invalid-without-error — color is never the
 * only signal. When `isInvalid`, `error` is required.
 */
export function StepValidatedFormRow({
  isInvalid,
  error,
  helpText,
  description,
  children,
  ...rest
}: React.ComponentProps<typeof EuiFormRow> & {
  /** The schema description: under the control while it is short, behind an info icon when long. */
  readonly description?: string;
}) {
  // `helpText` is the status or hint for the control ("Defined in YAML", the fixed-only note):
  // it is always under it.
  const { fontSize, lineHeight } = useEuiFontSize('xs');
  const descriptionId = useGeneratedHtmlId({ prefix: 'workflowStepConfigDescription' });
  const { measureRef, isLong } = useDescriptionOverflow(description);
  if (isInvalid && (error === undefined || error === null || error === '')) {
    throw new Error('StepValidatedFormRow: isInvalid requires a visible error message');
  }
  const inlineDescription = isLong ? undefined : description;
  const underControl =
    inlineDescription && helpText ? (
      <>
        {inlineDescription} {helpText}
      </>
    ) : (
      inlineDescription ?? helpText
    );
  const descriptionIcon =
    description && isLong ? (
      <EuiIconTip
        type="info"
        color="subdued"
        content={description}
        aria-label={i18n.translate('workflows.stepConfigPanel.fieldDescriptionIcon', {
          defaultMessage: 'About this field',
        })}
        anchorProps={{
          'data-test-subj': 'workflowStepConfigFieldDescriptionIcon',
          // The icon sits inside the row's <label>: a click must not reach the control it labels.
          onClick: (event) => event.preventDefault(),
        }}
      />
    ) : undefined;
  return (
    <div css={{ position: 'relative' }}>
      <FieldDescriptionIconContext.Provider value={descriptionIcon}>
        <EuiFormRow
          {...rest}
          isInvalid={isInvalid}
          error={isInvalid ? error : undefined}
          helpText={isInvalid ? undefined : underControl}
          // A hidden element can still describe the control, so a moved description stays announced.
          describedByIds={isLong ? [descriptionId] : undefined}
        >
          {children}
        </EuiFormRow>
      </FieldDescriptionIconContext.Provider>
      {description ? (
        <div
          ref={measureRef}
          id={descriptionId}
          css={{
            position: 'absolute',
            insetInline: 0,
            top: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: DESCRIPTION_MAX_LINES,
            fontSize,
            lineHeight,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}
