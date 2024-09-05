/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import { ScopedHistory } from '@kbn/core-application-browser';
import { useRouterBreadcrumb } from './use_router_breadcrumb';

export const RouterBreadcrumb = ({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactElement;
}) => {
  const {
    services: { http },
  } = useKibana();

  const history = useHistory() as ScopedHistory;

  useRouterBreadcrumb(() => ({ title, href: history.createHref({ pathname: href }) }), []);

  return children;
};
