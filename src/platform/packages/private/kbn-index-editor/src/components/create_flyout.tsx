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
import { distinctUntilChanged, firstValueFrom, from, skip, takeUntil } from 'rxjs';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';

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

  const LazyFlyoutContent = lazy(async () => {
    const { FlyoutContent } = await import('./flyout_content');
    return {
      default: FlyoutContent,
    };
  });

  const onFlyoutClose = async () => {
    if (indexUpdateService.mode === 'edition') {
      indexUpdateService.discardUnsavedChanges();

      const pendingColumnsToBeSaved = await firstValueFrom(
        indexUpdateService.pendingColumnsToBeSaved$
      );

      if (pendingColumnsToBeSaved.length) {
        deps.indexUpdateService.setExitAttemptWithUnsavedFields(true);
        return;
      }
    }

    props.onClose?.({
      indexName: indexUpdateService.getIndexName()!,
      indexCreatedDuringFlyout: props.doesIndexExist ? false : indexUpdateService.getIndexCreated(),
    });

    indexUpdateService.destroy();
    flyoutSession.close();
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
    }
  );

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
