/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import Form from '@rjsf/core';
import type { IChangeEvent } from '@rjsf/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import type { PageInputs, PageUi } from '@kbn/workflows/spec/schema/triggers/page_trigger_schema';
import { PageFormValidator } from './page_validator';
import { pageTemplates, pageWidgets, toRenderSchema, withWidgetComponents } from './page_widgets';
import type { PageFormPreviewProps } from '../types';

/** What a page form shows: the page trigger's title, description, inputs, and ui. */
export interface PageDefinition {
  title?: string;
  description?: string;
  schema?: PageInputs;
  ui?: PageUi;
}

export type PageFormData = Record<string, unknown>;

/** The form draws its own heading, so the schema title and description are not repeated. */
const toFormSchema = (schema: PageInputs | undefined): RJSFSchema => {
  const { title, description, ...rest } = schema ?? { type: 'object' as const };
  return { type: 'object', ...rest } as RJSFSchema;
};

/** `ui:order` must name every field; fields that only a rule adds go last. */
const toFormUiSchema = (ui: PageUi | undefined): UiSchema => {
  const order = ui?.['ui:order'];
  const withRest = order && !order.includes('*') ? [...order, '*'] : order;
  return {
    ...ui,
    ...(withRest ? { 'ui:order': withRest } : {}),
    'ui:submitButtonOptions': {
      submitText: i18n.translate('workflows.pages.submit', { defaultMessage: 'Submit' }),
      ...ui?.['ui:submitButtonOptions'],
    },
  } as UiSchema;
};

export interface PageFormProps {
  definition: PageDefinition;
  /** Gets the validated values. */
  onSubmit: (formData: PageFormData) => void;
  disabled?: boolean;
  submitError?: string;
}

/** The heading and the rjsf form of a page. The page app and the authoring preview share it. */
export const PageForm = ({ definition, onSubmit, disabled, submitError }: PageFormProps) => {
  const [formData, setFormData] = useState<PageFormData>({});
  const schema = useMemo(() => toFormSchema(toRenderSchema(definition.schema)), [definition]);
  const validator = useMemo(() => new PageFormValidator(definition.schema), [definition]);
  const uiSchema = useMemo(
    () => withWidgetComponents(definition.schema, toFormUiSchema(definition.ui)),
    [definition]
  );
  const handleSubmit = useCallback(
    ({ formData: submitted }: IChangeEvent) => onSubmit(submitted ?? {}),
    [onSubmit]
  );

  return (
    <>
      {definition.title && (
        <EuiTitle size="m">
          <h1>{definition.title}</h1>
        </EuiTitle>
      )}
      {definition.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <p>{definition.description}</p>
          </EuiText>
        </>
      )}
      <EuiSpacer size="l" />
      {submitError && (
        <>
          <KbnDangerCallout announceOnMount size="s" title={submitError} />
          <EuiSpacer size="m" />
        </>
      )}
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        widgets={pageWidgets}
        templates={pageTemplates}
        onChange={({ formData: changed }) => setFormData(changed ?? {})}
        onSubmit={handleSubmit}
        disabled={disabled}
        showErrorList={false}
        noHtml5Validate
        // A `const` choice is an option, not a default: start with nothing selected.
        experimental_defaultFormStateBehavior={{ constAsDefaults: 'never' }}
        omitExtraData
        liveOmit
      />
    </>
  );
};

/**
 * The page form for authors. Submit runs the same validation as the public page, then shows
 * the inputs the workflow would get. Nothing is sent and the workflow does not run.
 */
export const PageFormPreview = ({ definition }: PageFormPreviewProps) => {
  const [submitted, setSubmitted] = useState<PageFormData>();

  return (
    <>
      <KbnInfoCallout
        size="s"
        title={i18n.translate('workflows.pages.preview.notice', {
          defaultMessage: 'Preview. Submitting checks the form but does not run the workflow.',
        })}
      />
      <EuiSpacer size="m" />
      {/* A new definition can drop fields, so it starts a new form. */}
      <PageForm key={JSON.stringify(definition)} definition={definition} onSubmit={setSubmitted} />
      {submitted && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>
              {i18n.translate('workflows.pages.preview.inputs', {
                defaultMessage: 'The workflow would get these inputs:',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {JSON.stringify(submitted, null, 2)}
          </EuiCodeBlock>
        </>
      )}
    </>
  );
};
