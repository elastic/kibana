/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart, ChromeBreadcrumb, ChromeStart } from '@kbn/core/public';
import type { MouseEvent } from 'react';
import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';

function addClickHandlers(
  breadcrumbs: ChromeBreadcrumb[],
  navigateToHref?: (url: string) => Promise<void>
): ChromeBreadcrumb[] {
  return breadcrumbs.map((bc) => ({
    ...bc,
    ...(bc.href
      ? {
          onClick: (event: MouseEvent) => {
            if (navigateToHref && bc.href) {
              event.preventDefault();
              navigateToHref(bc.href);
            }
          },
        }
      : {}),
  }));
}

function getTitleFromBreadCrumbs(breadcrumbs: ChromeBreadcrumb[]) {
  return breadcrumbs.map(({ text }) => text?.toString() ?? '').reverse();
}

export const useBreadcrumbs = (breadcrumbs: ChromeBreadcrumb[]) => {
  const {
    services: {
      chrome: { docTitle, setBreadcrumbs, getChromeStyle$ },
      application: { navigateToUrl },
    },
  } = useKibana<{
    application: ApplicationStart;
    chrome: ChromeStart;
  }>();

  const chromeStyle = useObservable(getChromeStyle$());
  const isProjectNavigation = chromeStyle === 'project';

  const setTitle = docTitle.change;

  useEffect(() => {
    if (setBreadcrumbs) {
      const breadcrumbsWithClickHandlers = addClickHandlers(breadcrumbs, navigateToUrl);
      setBreadcrumbs(breadcrumbsWithClickHandlers, {
        project: {
          value: breadcrumbsWithClickHandlers,
          absolute: true,
        },
      });
    }
    if (setTitle) {
      setTitle(getTitleFromBreadCrumbs(breadcrumbs));
    }
  }, [isProjectNavigation, breadcrumbs, navigateToUrl, setBreadcrumbs, setTitle]);
};
