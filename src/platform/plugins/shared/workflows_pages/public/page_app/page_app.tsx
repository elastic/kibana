/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiLoadingSpinner, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { PageDefinition, PageFormData } from './page_form';
import { PageForm } from './page_form';
import { PAGE_API_PATH } from '../../common';

interface PageRef {
  workflowId: string;
  secret: string;
}

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

  const onSubmit = useCallback(
    async (submitted: PageFormData) => {
      if (!page) {
        return;
      }
      setIsSubmitting(true);
      setSubmitError(undefined);
      try {
        await http.post(pageApiPath(page), { body: JSON.stringify(submitted) });
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
      <PageForm
        definition={loadState.definition}
        onSubmit={onSubmit}
        disabled={isSubmitting}
        submitError={submitError}
      />
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
