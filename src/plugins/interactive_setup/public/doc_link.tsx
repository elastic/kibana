/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiLinkAnchorProps } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useCallback } from 'react';

import type { DocLinksStart } from 'kibana/public';

import { useKibana } from './use_kibana';

export type DocLinks = DocLinksStart['links'];
export type GetDocLinkFunction = (app: string, doc: string) => string;

/**
 * Creates links to the documentation.
 *
 * @see {@link DocLink} for a component that creates a link to the docs.
 *
 * @example
 * ```typescript
 * <DocLink app="elasticsearch" doc="built-in-roles.html">
 *   Learn what privileges individual roles grant.
 * </DocLink>
 * ```
 *
 * @example
 * ```typescript
 * const [docs] = useDocLinks();
 *
 * <EuiLink href={docs.dashboard.guide} target="_blank" external>
 *   Learn how to get started with dashboards.
 * </EuiLink>
 * ```
 */
export function useDocLinks(): [DocLinks, GetDocLinkFunction] {
  const { docLinks } = useKibana();
  const { links, ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const getDocLink = useCallback<GetDocLinkFunction>(
    (app, doc) => {
      return `${ELASTIC_WEBSITE_URL}guide/en/${app}/reference/${DOC_LINK_VERSION}/${doc}`;
    },
    [ELASTIC_WEBSITE_URL, DOC_LINK_VERSION]
  );
  return [links, getDocLink];
}

export interface DocLinkProps extends Omit<EuiLinkAnchorProps, 'href'> {
  app: string;
  doc: string;
}

export const DocLink: FunctionComponent<DocLinkProps> = ({ app, doc, ...props }) => {
  const [, getDocLink] = useDocLinks();
  return <EuiLink href={getDocLink(app, doc)} target="_blank" external {...props} />;
};
