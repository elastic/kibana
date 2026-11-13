/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { StepFieldRow } from './step_field_row';
import { SwitchCasesField } from './switch_cases_field';
import type { buildDataReferenceCatalog } from '../lib/build_data_reference_catalog';
import type { ParsedStepFragment } from '../lib/parse_step_fragment';
import type { StepFormField } from '../lib/step_form_schema';
import { fieldId, isEmptyFieldValue } from '../lib/step_form_schema';

export function StepForm({
  stepType,
  fields,
  hasSchema,
  step,
  showValidation,
  referenceCatalog,
  onChange,
  onDraftErrorChange,
  onExpandField,
}: {
  stepType: string;
  fields: readonly StepFormField[];
  /** False when no connector/built-in schema was resolved for this step type. */
  hasSchema: boolean;
  step: ParsedStepFragment;
  showValidation: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  onChange: (field: StepFormField, value: unknown) => void;
  onDraftErrorChange: (id: string, error: string | undefined) => void;
  onExpandField: (field: StepFormField) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const inputsAccordionId = useGeneratedHtmlId({ prefix: 'workflowStepConfigInputs' });
  const [optionalPickerOpen, setOptionalPickerOpen] = useState(false);

  // Primary = required or `advanced: false` (promoted). Everything else is optional
  // and only appears after the user adds it (or when it already has a value).
  const { primaryFields, optionalFields } = useMemo(() => {
    const primary: StepFormField[] = [];
    const optional: StepFormField[] = [];
    for (const field of fields) {
      if (field.required || field.advanced === false) primary.push(field);
      else optional.push(field);
    }
    return { primaryFields: primary, optionalFields: optional };
  }, [fields]);

  const optionalById = useMemo(() => {
    const map = new Map<string, StepFormField>();
    for (const field of optionalFields) map.set(fieldId(field), field);
    return map;
  }, [optionalFields]);

  // Cleared values: an added optional field stays in the form until explicitly
  // removed — no disappearing mid-edit when the user clears the input.
  const [revealedOptionalIds, setRevealedOptionalIds] = useState<readonly string[]>(() => {
    const ids: string[] = [];
    for (const field of optionalFields) {
      if (!isEmptyFieldValue(step.read(field.path))) {
        ids.push(fieldId(field));
      }
    }
    return ids;
  });

  // Auto-reveal optionals that gain a value (e.g. YAML tab edits). Never auto-hide.
  useEffect(() => {
    setRevealedOptionalIds((prev) => {
      let next: string[] | undefined;
      for (const field of optionalFields) {
        const id = fieldId(field);
        if (prev.includes(id)) continue;
        if (isEmptyFieldValue(step.read(field.path))) continue;
        if (!next) next = [...prev];
        next.push(id);
      }
      return next ?? prev;
    });
  }, [step, optionalFields]);

  const revealedOptionalFields = useMemo(() => {
    const out: StepFormField[] = [];
    for (const id of revealedOptionalIds) {
      const field = optionalById.get(id);
      if (field) out.push(field);
    }
    return out;
  }, [optionalById, revealedOptionalIds]);

  const availableOptionalFields = useMemo(
    () => optionalFields.filter((field) => !revealedOptionalIds.includes(fieldId(field))),
    [optionalFields, revealedOptionalIds]
  );

  const formStackCss = {
    '.workflowStepConfigFieldRow + .workflowStepConfigFieldRow': {
      marginTop: euiTheme.size.l,
    },
  };

  const removeOptionalField = useCallback(
    (field: StepFormField) => {
      const id = fieldId(field);
      setRevealedOptionalIds((prev) => prev.filter((x) => x !== id));
      onChange(field, undefined);
      onDraftErrorChange(id, undefined);
    },
    [onChange, onDraftErrorChange]
  );

  const renderField = (
    field: StepFormField,
    options: { removable: boolean; showOptionalMarker?: boolean }
  ) => {
    if (stepType === 'switch' && field.key === 'cases') {
      return (
        <div key={fieldId(field)} className="workflowStepConfigFieldRow">
          <SwitchCasesField
            value={step.read(field.path)}
            onChange={(next) => onChange(field, next)}
          />
        </div>
      );
    }

    return (
      <StepFieldRow
        key={fieldId(field)}
        field={field}
        value={step.read(field.path)}
        showValidation={showValidation}
        referenceCatalog={referenceCatalog}
        showOptionalMarker={options.showOptionalMarker ?? !field.required}
        onRemove={options.removable ? () => removeOptionalField(field) : undefined}
        onChange={(value) => onChange(field, value)}
        onDraftErrorChange={(error) => onDraftErrorChange(fieldId(field), error)}
        onExpand={() => onExpandField(field)}
        renderSubField={(subField, subOptions) =>
          renderField(subField, { removable: false, ...subOptions })
        }
      />
    );
  };

  const addOptionalField = useCallback((field: StepFormField) => {
    const id = fieldId(field);
    setRevealedOptionalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setOptionalPickerOpen(false);
  }, []);

  const optionalPickerItems = availableOptionalFields.map((field) => (
    <EuiContextMenuItem
      key={fieldId(field)}
      onClick={() => addOptionalField(field)}
      data-test-subj={`workflowStepConfigAddOptionalOption-${fieldId(field)}`}
    >
      {field.label}
    </EuiContextMenuItem>
  ));

  const addOptionalButton =
    availableOptionalFields.length > 0 ? (
      <EuiPopover
        isOpen={optionalPickerOpen}
        closePopover={() => setOptionalPickerOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        button={
          <EuiButtonEmpty
            size="xs"
            flush="both"
            color="primary"
            iconType="plusCircle"
            onClick={(e) => {
              e.stopPropagation();
              setOptionalPickerOpen((open) => !open);
            }}
            data-test-subj="workflowStepConfigAddOptionalField"
          >
            {i18n.translate('workflows.stepConfigPanel.addOptionalField', {
              defaultMessage: 'Add optional',
            })}
          </EuiButtonEmpty>
        }
      >
        <EuiContextMenuPanel
          size="s"
          items={optionalPickerItems}
          data-test-subj="workflowStepConfigOptionalFieldMenu"
        />
      </EuiPopover>
    ) : undefined;

  return (
    <EuiAccordion
      id={inputsAccordionId}
      initialIsOpen
      paddingSize="none"
      buttonContent={
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('workflows.stepConfigPanel.inputsAccordion', {
              defaultMessage: 'Inputs',
            })}
          </h4>
        </EuiTitle>
      }
      extraAction={addOptionalButton}
      data-test-subj="workflowStepConfigPanelAccordion-inputs"
      css={{
        // Keep the Inputs row reachable while the form scrolls beneath it.
        '.euiAccordion__triggerWrapper': {
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: euiTheme.colors.backgroundBasePlain,
        },
      }}
    >
      <div data-test-subj="workflowStepConfigPanelForm" css={{ paddingTop: 12 }}>
        {fields.length === 0 ? (
          <EuiEmptyPrompt
            paddingSize="m"
            titleSize="xs"
            iconType={hasSchema ? 'checkCircleFill' : 'code'}
            title={
              <h3>
                {hasSchema
                  ? i18n.translate('workflows.stepConfigPanel.noInputsTitle', {
                      defaultMessage: 'No configuration needed',
                    })
                  : i18n.translate('workflows.stepConfigPanel.formUnavailableTitle', {
                      defaultMessage: 'Form unavailable',
                    })}
              </h3>
            }
            body={
              <EuiText size="s" color="subdued">
                {hasSchema
                  ? i18n.translate('workflows.stepConfigPanel.noInputsBody', {
                      defaultMessage:
                        'This step has no inputs to set. You can still rename it above or configure Advanced.',
                    })
                  : i18n.translate('workflows.stepConfigPanel.formUnavailableBody', {
                      defaultMessage:
                        'This step type is not mapped to a form. Switch to YAML to edit its configuration.',
                    })}
              </EuiText>
            }
            data-test-subj="workflowStepConfigPanelEmpty"
          />
        ) : (
          <div css={formStackCss} data-test-subj="workflowStepConfigPrimaryFields">
            {primaryFields.map((field) => renderField(field, { removable: false }))}
            {revealedOptionalFields.map((field) => renderField(field, { removable: true }))}
          </div>
        )}
      </div>
    </EuiAccordion>
  );
}
