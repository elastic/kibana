/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyoutHeader, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { FC } from 'react';
import React, { Suspense, lazy } from 'react';
import { combineLatest, distinctUntilChanged, first, from, skip, takeUntil } from 'rxjs';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';
import { isPlaceholderColumn } from '../utils';

export function createFlyout(deps: FlyoutDeps, props: EditLookupIndexContentContext) {
  const {
    http,
    overlays,
    application: { currentAppId$ },
    ...startServices
  } = deps.coreStart;

  const indexUpdateService = deps.indexUpdateService;

  if (props.indexName) {
    // set initial index name
    indexUpdateService.setIndexName(props.indexName);
  }
  indexUpdateService.setIndexCreated(props.doesIndexExist);

  // Track telemetry event when flyout is opened
  if (props.doesIndexExist) {
    combineLatest([
      indexUpdateService.totalHits$.pipe(skip(1)), // skip initial value
      indexUpdateService.dataTableColumns$,
    ])
      .pipe(first())
      .subscribe(([docCount, columns]) => {
        deps.indexEditorTelemetryService.trackFlyoutOpened({
          docCount,
          fieldCount: columns.filter((c) => !isPlaceholderColumn(c.name)).length,
        });
      });
  } else {
    deps.indexEditorTelemetryService.trackFlyoutOpened({ docCount: 0, fieldCount: 0 });
  }

  const LazyFlyoutContent = lazy(async () => {
    const { FlyoutContent } = await import('./flyout_content');
    return {
      default: FlyoutContent,
    };
  });

  /** Callback to invoke when the user attempts to close the flyout */
  const onFlyoutClose = () => {
    indexUpdateService.exit();
  };

  const flyoutSession = overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<LoadingContents />}>
        <LazyFlyoutContent deps={deps} props={{ ...props, onClose: onFlyoutClose }} />
      </Suspense>,
      startServices
    ),
    {
      'data-test-subj': 'lookupIndexFlyout',
      ownFocus: true,
      onClose: onFlyoutClose,
      size: 'l',
      outsideClickCloses: false,
    }
  );

  indexUpdateService.completed$.subscribe(({ indexName, isIndexCreated, indexHasNewFields }) => {
    props.onClose?.({
      indexName,
      indexCreatedDuringFlyout: props.doesIndexExist ? false : isIndexCreated,
      indexHasNewFields,
    });
    flyoutSession.close();
  });

  // Close the flyout when user navigates out of the current plugin
  currentAppId$
    .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
    .subscribe(() => {
      flyoutSession.close();
    });
}

const LoadingContents: FC = () => (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage id="indexEditor.flyout.title" defaultMessage="Index name" />
        </h3>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiSpacer />
    <EuiSkeletonText />
  </>
);
