/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import type { QueryOperator } from '@kbn/esql-composer';

import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useDocViewerExtensionActionsContext } from '../../../../../hooks/use_doc_viewer_extension_actions';
import { getLinkActionProps } from '../../../../content_framework/utils/link_action';

export const DiscoverEsqlLink = ({
  indexPattern,
  whereClause,
  tabLabel,
  dataTestSubj,
  children,
}: {
  indexPattern?: string;
  whereClause?: QueryOperator;
  tabLabel: string;
  dataTestSubj: string;
  children: React.ReactNode;
}) => {
  const actions = useDocViewerExtensionActionsContext();
  const openInNewTab = actions?.openInNewTab;

  const { discoverUrl, esqlQueryString } = useDiscoverLinkAndEsqlQuery({
    indexPattern,
    whereClause,
  });

  const canOpenInNewTab = openInNewTab && esqlQueryString;

  const onClick = useCallback(() => {
    if (canOpenInNewTab) {
      openInNewTab!({
        query: { esql: esqlQueryString! },
        tabLabel,
      });
    }
  }, [canOpenInNewTab, esqlQueryString, openInNewTab, tabLabel]);

  const linkProps = getLinkActionProps({
    href: discoverUrl,
    onClick: canOpenInNewTab ? onClick : undefined,
  });

  return discoverUrl || canOpenInNewTab ? (
    <EuiLink data-test-subj={dataTestSubj} {...linkProps}>
      {children}
    </EuiLink>
  ) : (
    <>{children}</>
  );
};
