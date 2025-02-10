/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ApplicationStart, ChromeBreadcrumb, ChromeStart } from '@kbn/core/public';
import { MouseEvent, useEffect, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
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

export const useBreadcrumbs = (
  extraCrumbs: ChromeBreadcrumb[],
  options?: {
    app?: { id: string; label: string };
    breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension;
    serverless?: ServerlessPluginStart;
  }
) => {
  const { app, breadcrumbsAppendExtension, serverless } = options ?? {};

  const {
    services: {
      chrome: {
        docTitle,
        setBreadcrumbs: chromeSetBreadcrumbs,
        setBreadcrumbsAppendExtension,
        getChromeStyle$,
      },
      application: { getUrlForApp, navigateToUrl },
    },
  } = useKibana<{
    application: ApplicationStart;
    chrome: ChromeStart;
  }>();

  const chromeStyle = useObservable(getChromeStyle$());
  const isProjectNavigation = chromeStyle === 'project';

  const setTitle = docTitle.change;
  const appPath = getUrlForApp(app?.id ?? 'observability-overview') ?? '';

  const setBreadcrumbs = useMemo(
    () => serverless?.setBreadcrumbs ?? chromeSetBreadcrumbs,
    [serverless, chromeSetBreadcrumbs]
  );

  useEffect(() => {
    if (breadcrumbsAppendExtension) {
      return setBreadcrumbsAppendExtension(breadcrumbsAppendExtension);
    }
  }, [breadcrumbsAppendExtension, setBreadcrumbsAppendExtension]);

  useEffect(() => {
    const breadcrumbs = isProjectNavigation
      ? extraCrumbs
      : [
          {
            text:
              app?.label ??
              i18n.translate('xpack.observabilityShared.breadcrumbs.observabilityLinkText', {
                defaultMessage: 'Observability',
              }),
            href: appPath + '/overview',
          },
          ...extraCrumbs,
        ];

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
  }, [
    app?.label,
    isProjectNavigation,
    appPath,
    extraCrumbs,
    navigateToUrl,
    serverless,
    setBreadcrumbs,
    setTitle,
  ]);
};
