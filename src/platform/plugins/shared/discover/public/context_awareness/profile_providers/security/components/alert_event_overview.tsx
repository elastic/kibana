/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import type { DocViewerComponent } from '@kbn/unified-doc-viewer/types';
import { EuiSpacer } from '@elastic/eui';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const AlertEventOverview: DocViewerComponent = ({ hit }) => {
  const { discoverShared } = useDiscoverServices();
  const discoverFeaturesRegistry = discoverShared.features.registry;
  const alertFlyoutOverviewTabComponent = discoverFeaturesRegistry.getById(
    'security-solution-alert-flyout-overview-tab'
  );
  const alertFlyoutOverviewTabComponentRender = alertFlyoutOverviewTabComponent?.render;

  const [ResolvedAlertFlyoutOverviewTabComponent, setResolvedAlertFlyoutOverviewTabComponent] =
    useState<(() => Element) | null>(null);

  const id = useMemo(() => getFieldValue(hit, '_id') as string, [hit]);
  const indexName = useMemo(() => getFieldValue(hit, '_index') as string, [hit]);
  const scopeId = 'discover';

  useEffect(() => {
    let mounted = true;
    if (!alertFlyoutOverviewTabComponentRender) {
      setResolvedAlertFlyoutOverviewTabComponent(null);
      return;
    }

    alertFlyoutOverviewTabComponentRender({ id, indexName, scopeId })
      .then((Comp) => {
        if (!mounted) return;
        setResolvedAlertFlyoutOverviewTabComponent(() => Comp);
      })
      .catch(() => {
        if (!mounted) return;
        setResolvedAlertFlyoutOverviewTabComponent(null);
      });

    return () => {
      mounted = false;
    };
  }, [id, indexName, alertFlyoutOverviewTabComponentRender]);

  return (
    <>
      {ResolvedAlertFlyoutOverviewTabComponent ? (
        <>
          <EuiSpacer size="m" />
          <ResolvedAlertFlyoutOverviewTabComponent
            id={id}
            indexName={indexName}
            scopeId={scopeId}
          />
        </>
      ) : null}
    </>
  );
};
