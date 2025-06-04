/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { Suspense, lazy } from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs';
import { from } from 'rxjs';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { EuiFlyoutHeader, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EditLookupIndexContentContext, EditLookupIndexFlyoutDeps } from '../types';
import { IndexUpdateService } from '../index_update_service';

export function createFlyout(
  deps: EditLookupIndexFlyoutDeps,
  props: EditLookupIndexContentContext
) {
  const {
    http,
    overlays,
    application: { currentAppId$ },
    ...startServices
  } = deps.coreStart;

  const indexUpdateService = new IndexUpdateService(http);

  if (props.indexName) {
    // set initial index name
    indexUpdateService.setIndexName(props.indexName);
  }

  const LazyFlyoutContent = lazy(async () => {
    const { FlyoutContent } = await import('./flyout_content');
    return {
      default: FlyoutContent,
    };
  });

  const onFlyoutClose = () => {
    flyoutSession.close();
  };

  const onSave = () => {
    // TODO refresh lookup index list
    onFlyoutClose();
  };

  const flyoutSession = overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<LoadingContents />}>
        <LazyFlyoutContent
          deps={{ ...deps, indexUpdateService }}
          props={{ ...props, onClose: onFlyoutClose, onSave }}
        />
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
