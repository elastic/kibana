/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { DiscoverServices } from '../build_services';
import type { EmbeddableEditorService } from '../plugin_imports/embeddable_editor_service';

const rootPath = '#/';

function getRootBreadcrumbs({
  breadcrumb,
  embeddable,
}: {
  breadcrumb?: string;
  embeddable: EmbeddableEditorService;
}): ChromeBreadcrumb[] {
  const isEmbeddedEditor = embeddable.isEmbeddedEditor();
  const href = isEmbeddedEditor ? undefined : breadcrumb || rootPath;

  return [
    {
      text: isEmbeddedEditor
        ? i18n.translate('discover.rootDashboardsEditorBreadcrumb', {
            defaultMessage: 'Dashboards',
          })
        : i18n.translate('discover.rootBreadcrumb', {
            defaultMessage: 'Discover',
          }),
      deepLinkId: isEmbeddedEditor ? 'dashboards' : 'discover',
      href,
      onClick: isEmbeddedEditor ? () => embeddable.transferBackToEditor() : undefined,
    },
  ];
}

/**
 * Helper function to set the Discover's breadcrumb
 * if there's an active savedSearch, its title is appended
 */
export function setBreadcrumbs({
  rootBreadcrumbPath,
  titleBreadcrumbText,
  services,
}: {
  rootBreadcrumbPath?: string;
  titleBreadcrumbText?: string;
  services: DiscoverServices;
}) {
  const embeddable = services.embeddableEditor;
  const byValueTitle = embeddable.getByValueInput()?.label;

  const breadcrumbTitle = byValueTitle || titleBreadcrumbText;

  if (breadcrumbTitle) {
    const rootBreadcrumbs = getRootBreadcrumbs({
      breadcrumb: rootBreadcrumbPath,
      embeddable,
    });

    services.chrome.setBreadcrumbs([
      ...rootBreadcrumbs,
      {
        text: embeddable.isEmbeddedEditor()
          ? i18n.translate('discover.dashboardsEditorBreadcrumbEditingTitle', {
              defaultMessage: 'Editing {title}',
              values: { title: breadcrumbTitle },
            })
          : breadcrumbTitle,
      },
    ]);
  } else {
    const discoverBreadcrumbsTitle = embeddable.isEmbeddedEditor()
      ? i18n.translate('discover.dashboardsEditorBreadcrumbTitle', {
          defaultMessage: 'Dashboards',
        })
      : i18n.translate('discover.discoverBreadcrumbTitle', {
          defaultMessage: 'Discover',
        });

    services.chrome.setBreadcrumbs([
      {
        text: discoverBreadcrumbsTitle,
      },
    ]);
  }
}
