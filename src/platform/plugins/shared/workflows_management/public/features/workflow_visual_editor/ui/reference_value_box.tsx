/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isReferenceValue } from '@kbn/workflows-yaml';
import { DataReferencePicker } from './data_reference_picker';
import { ReferenceChip } from './reference_chip';
import { useStableCallback } from './use_stable_callback';
import {
  clearActiveDataReferenceInsertTarget,
  setActiveDataReferenceInsertTarget,
} from '../../../shared/lib/active_data_reference_insert_target';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import {
  formatDataReferenceToken,
  formatValueReferenceToken,
} from '../lib/build_data_reference_catalog';
import type { ReferenceForm } from '../lib/reference_value';
import {
  isContainerReference,
  lookupReferenceTypeLabel,
  parseWholeReference,
} from '../lib/reference_value';

/**
 * The "Data" side of a Fixed | Data switch: one box holding a single reference chip that
 * stands for the whole value. `form` is what a pick writes (`text` → `{{ }}`, `value` →
 * `${{ }}`); a text-form reference in a value-form field is flagged and can be fixed in one click.
 */
export function ReferenceValueBox({
  catalog,
  value,
  form,
  onChange,
  isInvalid = false,
  onBlur,
  ariaLabel,
  keepTypeFor = 'any',
  onExpand,
  'data-test-subj': dataTestSubj,
}: {
  readonly catalog: DataReferenceCatalog;
  readonly value: unknown;
  readonly form: ReferenceForm;
  readonly onChange: (next: string | undefined) => void;
  readonly isInvalid?: boolean;
  readonly onBlur?: () => void;
  readonly ariaLabel: string;
  /**
   * Which stored text-form references get the "Keep the type" nudge. `any` for numbers and
   * yes/no; `containers` for fields where one string is a valid value too (`index`), so only a
   * reference known to be a list or record is flagged.
   */
  readonly keepTypeFor?: 'any' | 'containers';
  /** When set, shows a control that opens the expanded field editor (reference tree + run data). */
  readonly onExpand?: () => void;
  readonly 'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  const [isOpen, setIsOpen] = useState(false);
  const pickButtonRef = useRef<HTMLButtonElement | null>(null);

  const whole = parseWholeReference(value);
  // A typed value kept while the switch sits on Data is not a reference, so it isn't shown here.
  const hasValue = isReferenceValue(value);
  const typeLabel = whole ? lookupReferenceTypeLabel(catalog, whole.expression) : undefined;
  const needsKeepType =
    whole?.form === 'text' &&
    form === 'value' &&
    (keepTypeFor === 'any' || isContainerReference(whole.expression, typeLabel));

  const closePicker = useCallback(() => {
    setIsOpen(false);
    pickButtonRef.current?.focus();
  }, []);

  const handleInsert = useStableCallback((token: string) => {
    const picked = parseWholeReference(token);
    setIsOpen(false);
    if (!picked) {
      onChange(token);
      return;
    }
    onChange(
      form === 'value'
        ? formatValueReferenceToken(picked.expression)
        : formatDataReferenceToken(picked.expression)
    );
  });

  useEffect(() => () => clearActiveDataReferenceInsertTarget(handleInsert), [handleInsert]);

  const pickLabel = i18n.translate('workflows.stepConfigPanel.referenceBox.pick', {
    defaultMessage: 'Pick data from an earlier step for {field}',
    values: { field: ariaLabel },
  });
  const clearLabel = i18n.translate('workflows.stepConfigPanel.referenceBox.clear', {
    defaultMessage: 'Clear data reference for {field}',
    values: { field: ariaLabel },
  });

  const expandLabel = i18n.translate('workflows.stepConfigPanel.referenceBox.expand', {
    defaultMessage: 'Open expanded editor for {field}',
    values: { field: ariaLabel },
  });

  const chipHint = !whole
    ? undefined
    : needsKeepType
    ? i18n.translate('workflows.stepConfigPanel.referenceBox.textFormHint', {
        defaultMessage: 'Written as text, so this becomes a string',
      })
    : whole.form === 'value'
    ? i18n.translate('workflows.stepConfigPanel.referenceBox.valueFormHint', {
        defaultMessage: 'Written as a value, so it keeps its type',
      })
    : i18n.translate('workflows.stepConfigPanel.referenceBox.textHint', {
        defaultMessage: 'Written as text',
      });

  const content = whole ? (
    <ReferenceChip
      expression={whole.expression}
      typeLabel={typeLabel}
      tone={needsKeepType ? 'warning' : 'neutral'}
      hint={chipHint}
      onClick={() => setIsOpen(true)}
      data-test-subj={`${dataTestSubj}-chip`}
    />
  ) : hasValue ? (
    // A Liquid tag or another expression that isn't one whole reference: show it as typed.
    <span
      css={{
        fontFamily: euiTheme.font.familyCode,
        fontSize,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      data-test-subj={`${dataTestSubj}-expression`}
    >
      {String(value)}
    </span>
  ) : (
    <EuiText size="xs" color="subdued">
      {i18n.translate('workflows.stepConfigPanel.referenceBox.placeholder', {
        defaultMessage: 'Select data from an earlier step',
      })}
    </EuiText>
  );

  const box = (
    <div
      onFocusCapture={() => setActiveDataReferenceInsertTarget(handleInsert)}
      onBlur={onBlur}
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.xs,
        minBlockSize: euiTheme.size.xl,
        paddingInline: euiTheme.size.s,
        boxSizing: 'border-box',
        borderRadius: euiTheme.border.radius.small,
        border: `${euiTheme.border.width.thin} solid ${
          isInvalid ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBasePlain
        }`,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        '&:focus-within': { borderColor: euiTheme.colors.borderStrongPrimary },
      }}
      data-test-subj={dataTestSubj}
    >
      <div css={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center' }}>
        {content}
      </div>
      {hasValue ? (
        <EuiToolTip content={clearLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            size="xs"
            color="text"
            aria-label={clearLabel}
            onClick={() => onChange(undefined)}
            data-test-subj={`${dataTestSubj}-clear`}
          />
        </EuiToolTip>
      ) : null}
      <EuiToolTip content={pickLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          buttonRef={pickButtonRef}
          iconType="tokenObject"
          size="xs"
          color={isOpen ? 'primary' : 'text'}
          aria-label={pickLabel}
          aria-pressed={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={`${dataTestSubj}-pick`}
        />
      </EuiToolTip>
      {onExpand ? (
        <EuiToolTip content={expandLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="fullScreen"
            size="xs"
            color="text"
            aria-label={expandLabel}
            onClick={onExpand}
            data-test-subj={`${dataTestSubj}-expand`}
          />
        </EuiToolTip>
      ) : null}
    </div>
  );

  return (
    <>
      <DataReferencePicker
        catalog={catalog}
        isOpen={isOpen}
        onClose={closePicker}
        onInsert={handleInsert}
        input={box}
      />
      {needsKeepType && whole ? (
        <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}-keepTypeHint`}>
          {i18n.translate('workflows.stepConfigPanel.referenceBox.keepTypeHint', {
            defaultMessage: 'Written as text, so this becomes a string.',
          })}{' '}
          <EuiButtonEmpty
            size="xs"
            flush="both"
            onClick={() => onChange(formatValueReferenceToken(whole.expression))}
            data-test-subj={`${dataTestSubj}-keepType`}
          >
            {i18n.translate('workflows.stepConfigPanel.referenceBox.keepType', {
              defaultMessage: 'Keep the type',
            })}
          </EuiButtonEmpty>
        </EuiText>
      ) : null}
    </>
  );
}
