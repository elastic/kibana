/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import Form from '@rjsf/core';
import type { IChangeEvent } from '@rjsf/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { PageInputs, PageUi } from '@kbn/workflows/spec/schema/triggers/page_trigger_schema';
import { PageFormValidator } from './page_validator';
import { pageTemplates, pageWidgets, toRenderSchema, withWidgetComponents } from './page_widgets';
import { PAGE_API_PATH } from '../../common';

/** The form definition returned by the server, after the secret check. */
interface PageDefinition {
  title?: string;
  description?: string;
  schema?: PageInputs;
  ui?: PageUi;
}

interface PageRef {
  workflowId: string;
  secret: string;
}

type PageFormData = Record<string, unknown>;

const PAGE_PATH_PATTERN = /^\/pages\/([^/]+)\/k\/([^/]+)\/?$/;

/** Reads the workflow id and the secret from the page URL, without the base path. */
export const parsePagePath = (path: string): PageRef | undefined => {
  const match = PAGE_PATH_PATTERN.exec(path);
  if (!match) {
    return undefined;
  }
  return { workflowId: decodeURIComponent(match[1]), secret: decodeURIComponent(match[2]) };
};

const pageApiPath = ({ workflowId, secret }: PageRef) =>
  PAGE_API_PATH.replace('{workflowId}', encodeURIComponent(workflowId)).replace(
    '{secret}',
    encodeURIComponent(secret)
  );

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

const errorMessage = (error: unknown): string => {
  const body = (error as { body?: { message?: string } })?.body;
  return body?.message ?? (error instanceof Error ? error.message : String(error));
};

type LoadState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; definition: PageDefinition };

export const PageApp = ({ http, page }: { http: HttpSetup; page: PageRef | undefined }) => {
  const { euiTheme } = useEuiTheme();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [formData, setFormData] = useState<PageFormData>({});
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!page) {
      setLoadState({ status: 'failed' });
      return;
    }
    http
      .get<PageDefinition>(pageApiPath(page))
      .then((definition) => setLoadState({ status: 'ready', definition }))
      .catch(() => setLoadState({ status: 'failed' }));
  }, [http, page]);

  const definition = loadState.status === 'ready' ? loadState.definition : undefined;
  const schema = useMemo(() => toFormSchema(toRenderSchema(definition?.schema)), [definition]);
  const validator = useMemo(() => new PageFormValidator(definition?.schema), [definition]);
  const uiSchema = useMemo(
    () => withWidgetComponents(definition?.schema, toFormUiSchema(definition?.ui)),
    [definition]
  );

  const onSubmit = useCallback(
    async ({ formData: submitted }: IChangeEvent) => {
      if (!page) {
        return;
      }
      setIsSubmitting(true);
      setSubmitError(undefined);
      try {
        await http.post(pageApiPath(page), { body: JSON.stringify(submitted ?? {}) });
        setIsSubmitted(true);
      } catch (error) {
        setSubmitError(errorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [http, page]
  );

  const pageCss = css`
    min-height: 100vh;
    padding: ${euiTheme.size.xxl} ${euiTheme.size.base};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;
  const panelCss = css`
    max-width: 640px;
    margin: 0 auto;
  `;

  let content: React.ReactNode;
  if (loadState.status === 'loading') {
    content = <EuiLoadingSpinner size="xl" />;
  } else if (loadState.status === 'failed') {
    content = (
      <EuiEmptyPrompt
        iconType="warning"
        title={
          <h2>
            {i18n.translate('workflows.pages.notFound', {
              defaultMessage: 'This page is not available',
            })}
          </h2>
        }
        body={i18n.translate('workflows.pages.notFoundBody', {
          defaultMessage: 'The link may be wrong or retired. Ask the page owner for a new link.',
        })}
      />
    );
  } else if (isSubmitted) {
    content = (
      <EuiEmptyPrompt
        iconType="checkCircleFill"
        color="success"
        title={
          <h2>
            {i18n.translate('workflows.pages.submitted', {
              defaultMessage: 'Thank you. Your response was sent.',
            })}
          </h2>
        }
      />
    );
  } else {
    content = (
      <>
        {definition?.title && (
          <EuiTitle size="m">
            <h1>{definition.title}</h1>
          </EuiTitle>
        )}
        {definition?.description && (
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
          onSubmit={onSubmit}
          disabled={isSubmitting}
          showErrorList={false}
          noHtml5Validate
          // A `const` choice is an option, not a default: start with nothing selected.
          experimental_defaultFormStateBehavior={{ constAsDefaults: 'never' }}
          omitExtraData
          liveOmit
        />
      </>
    );
  }

  return (
    <div css={pageCss}>
      <EuiPanel css={panelCss} paddingSize="xl" hasBorder>
        {content}
      </EuiPanel>
    </div>
  );
};

/** Mounts the anonymous page app. The server has already checked the secret in the URL. */
export const renderPageApp = (coreStart: CoreStart, element: HTMLElement) => {
  const page = parsePagePath(coreStart.http.basePath.remove(window.location.pathname));
  ReactDOM.render(
    coreStart.rendering.addContext(<PageApp http={coreStart.http} page={page} />),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
