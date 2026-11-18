/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonGroup,
  EuiConfirmModal,
  EuiFormRow,
  EuiSelect,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { blankVariantValue, inferVariant, isBlankVariantValue } from '../lib/form_variants';
import type { FormVariant, StepFormField } from '../lib/step_form_schema';
import { isEmptyFieldValue } from '../lib/step_form_schema';

/** Up to this many choices read best as a button group; more than that, a select. */
const MAX_BUTTON_GROUP_VARIANTS = 3;

/**
 * A field that can be written in more than one way (`number` or `{ limit, on-limit }`; a body
 * "by IDs" or "by query"): a switch for the way, then the fields of the chosen one. The way is
 * inferred from the stored value; switching away from a value asks first, because it replaces it.
 */
export function VariantField({
  field,
  value,
  onChange,
  renderField,
  label,
  labelAppend,
  helpText,
  'data-test-subj': dataTestSubj,
}: {
  readonly field: StepFormField;
  readonly value: unknown;
  /** Writes the whole value of the field; used when switching to another way. */
  readonly onChange: (next: unknown) => void;
  /** Renders one of the chosen variant's fields (they carry their real paths). */
  readonly renderField: (
    field: StepFormField,
    options: { readonly showOptionalMarker: boolean }
  ) => React.ReactElement;
  readonly label: React.ReactNode;
  readonly labelAppend?: React.ReactNode;
  readonly helpText?: React.ReactNode;
  readonly 'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'workflowStepConfigVariantConfirm' });
  const variants: readonly FormVariant[] = field.variants ?? [];
  const inferred = inferVariant(variants, value);
  const valueIsEmpty = isEmptyFieldValue(value) || isBlankVariantValue(variants, value);
  const [selectedId, setSelectedId] = useState(inferred.id);
  const [pending, setPending] = useState<FormVariant | undefined>();

  // A stored value decides the way; with no value the user's own choice stands.
  useEffect(() => {
    if (!valueIsEmpty) setSelectedId(inferred.id);
  }, [inferred.id, valueIsEmpty]);

  const active = variants.find((variant) => variant.id === selectedId) ?? inferred;

  const requestSwitch = (id: string) => {
    const target = variants.find((variant) => variant.id === id);
    if (!target) return;
    if (valueIsEmpty) {
      setSelectedId(target.id);
      // Choosing a way that is named by a `type` writes it, so the value says which way it is.
      if (target.discriminator) onChange(blankVariantValue(target));
      return;
    }
    if (target.id === active.id) return;
    setPending(target);
  };

  const confirmSwitch = () => {
    if (!pending) return;
    onChange(blankVariantValue(pending));
    setSelectedId(pending.id);
    setPending(undefined);
  };

  const legend = i18n.translate('workflows.stepConfigPanel.variants.legend', {
    defaultMessage: 'Way to write {field}',
    values: { field: field.label },
  });
  const selector =
    variants.length <= MAX_BUTTON_GROUP_VARIANTS ? (
      <EuiButtonGroup
        type="single"
        buttonSize="compressed"
        color="text"
        isFullWidth
        legend={legend}
        idSelected={active.id}
        onChange={requestSwitch}
        options={variants.map((variant) => ({
          id: variant.id,
          label: variant.label,
          'data-test-subj': `${dataTestSubj}-variant-${variant.id}`,
        }))}
        data-test-subj={`${dataTestSubj}-variants`}
      />
    ) : (
      <EuiSelect
        compressed
        fullWidth
        aria-label={legend}
        value={active.id}
        onChange={(event) => requestSwitch(event.target.value)}
        options={variants.map((variant) => ({ value: variant.id, text: variant.label }))}
        data-test-subj={`${dataTestSubj}-variants`}
      />
    );

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiFormRow
        label={label}
        labelAppend={labelAppend}
        helpText={helpText}
        fullWidth
        display="row"
      >
        {selector}
      </EuiFormRow>
      <div css={{ display: 'flex', flexDirection: 'column', rowGap: euiTheme.size.l }}>
        {active.fields.map((variantField) => (
          <div
            key={variantField.path.join('.')}
            css={{ marginBlockStart: euiTheme.size.s }}
            data-test-subj={`${dataTestSubj}-field`}
          >
            {renderField(variantField, {
              // A scalar way's one control is the field's value; the group already says Optional.
              showOptionalMarker: active.kind === 'object' && !variantField.required,
            })}
          </div>
        ))}
      </div>
      {pending ? (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          title={i18n.translate('workflows.stepConfigPanel.variants.confirmTitle', {
            defaultMessage: 'Replace current value?',
          })}
          titleProps={{ id: modalTitleId }}
          onCancel={() => setPending(undefined)}
          onConfirm={confirmSwitch}
          cancelButtonText={i18n.translate('workflows.stepConfigPanel.variants.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.stepConfigPanel.variants.switch', {
            defaultMessage: 'Switch',
          })}
          data-test-subj={`${dataTestSubj}-confirm`}
        >
          <p>
            {i18n.translate('workflows.stepConfigPanel.variants.confirmBody', {
              defaultMessage:
                '{field} is currently written as "{current}". Switching to "{target}" replaces it.',
              values: { field: field.label, current: active.label, target: pending.label },
            })}
          </p>
        </EuiConfirmModal>
      ) : null}
    </div>
  );
}
