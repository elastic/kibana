/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { getDataManagementCreateOverlay } from '../../data_management_create_overlays';
import type { DataManagementCreateOverlayId } from '../../types';
import { getCreateResourceMenu } from '../create_resource_menu';
import { ResourcesTable } from './resources_table';

const pageTitle = i18n.translate('management.dataManagementOverview.v2.pageTitle', {
  defaultMessage: 'Overview',
});

const pageDescription = i18n.translate('management.dataManagementOverview.v2.pageDescription', {
  defaultMessage:
    'All data resources in one place, including indices, data streams, ES|QL views, datasets, and streams.',
});

/** v2 prototype of the data management overview. Starts as a copy of v1. */
export const DataManagementOverviewPageV2 = ({
  getUrlForApp,
  http,
  share,
  toasts,
}: {
  getUrlForApp: CoreStart['application']['getUrlForApp'];
  http: CoreStart['http'];
  share: SharePluginStart;
  toasts: CoreStart['notifications']['toasts'];
}) => {
  const [openCreate, setOpenCreate] = useState<DataManagementCreateOverlayId | undefined>();
  const [esqlViewName, setEsqlViewName] = useState<string | undefined>();
  const closeCreate = useCallback(() => {
    setOpenCreate(undefined);
    setEsqlViewName(undefined);
  }, []);
  const openCreateOverlay = useCallback((id: DataManagementCreateOverlayId) => {
    setEsqlViewName(undefined);
    setOpenCreate(id);
  }, []);
  const editEsqlView = useCallback((name: string) => {
    setEsqlViewName(name);
    setOpenCreate('esqlView');
  }, []);
  const menu = useMemo(
    () =>
      getCreateResourceMenu({
        getUrlForApp,
        onOpenCreate: openCreateOverlay,
      }),
    [getUrlForApp, openCreateOverlay]
  );
  const createOverlay = openCreate ? getDataManagementCreateOverlay(openCreate) : undefined;

  return (
    <div data-prototype-variant="v2" data-test-subj="dataManagementOverviewPage">
      <AppHeader description={pageDescription} menu={menu} spacing="bleed" title={pageTitle} />
      <EuiSpacer size="l" />
      <ResourcesTable
        getUrlForApp={getUrlForApp}
        http={http}
        onEditEsqlView={editEsqlView}
        share={share}
        toasts={toasts}
      />
      {createOverlay?.({ onClose: closeCreate, esqlViewName })}
    </div>
  );
};
