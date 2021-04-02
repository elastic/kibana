/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppMountParameters, ChromeBreadcrumb, ScopedHistory } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { ManagementSection, MANAGEMENT_BREADCRUMB } from '../../utils';

import { ManagementRouter } from './management_router';
import { reactRouterNavigate } from '../../../../kibana_react/public';
import { SectionsServiceStart } from '../../types';

interface ManagementAppProps {
  appBasePath: string;
  history: AppMountParameters['history'];
  dependencies: ManagementAppDependencies;
}

export interface ManagementAppDependencies {
  sections: SectionsServiceStart;
  kibanaVersion: string;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
}

export const ManagementApp = ({ dependencies, history }: ManagementAppProps) => {
  const { setBreadcrumbs } = dependencies;
  const [sections, setSections] = useState<ManagementSection[]>();

  const setBreadcrumbsScoped = useCallback(
    (crumbs: ChromeBreadcrumb[] = [], appHistory?: ScopedHistory) => {
      const wrapBreadcrumb = (item: ChromeBreadcrumb, scopedHistory: ScopedHistory) => ({
        ...item,
        ...(item.href ? reactRouterNavigate(scopedHistory, item.href) : {}),
      });

      setBreadcrumbs([
        wrapBreadcrumb(MANAGEMENT_BREADCRUMB, history),
        ...crumbs.map((item) => wrapBreadcrumb(item, appHistory || history)),
      ]);
    },
    [setBreadcrumbs, history]
  );

  useEffect(() => {
    setSections(dependencies.sections.getSectionsEnabled());
  }, [dependencies.sections]);

  if (!sections) {
    return null;
  }

  return (
    <I18nProvider>
      <ManagementRouter
        history={history}
        setBreadcrumbs={setBreadcrumbsScoped}
        sections={sections}
        dependencies={dependencies}
      />
    </I18nProvider>
  );
};
