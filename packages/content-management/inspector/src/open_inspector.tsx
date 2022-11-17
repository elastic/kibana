/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useRef } from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

import { useServices } from './services';

import { InspectorLoader } from './components';
import type { InspectorFlyoutContentContainerProps } from './components';

export type OpenInspectorParams = Pick<
  InspectorFlyoutContentContainerProps,
  'item' | 'onSave' | 'isReadonly' | 'entityName' | 'checkForDuplicateTitle'
>;

export function useOpenInspector(postSaveHandler?: () => void | Promise<void>) {
  const services = useServices();
  const { openFlyout } = services;
  const flyout = useRef<OverlayRef | null>(null);

  const closeFlyout = useCallback(() => {
    flyout.current?.close();
  }, []);

  return useCallback(
    ({ onSave: onSaveOriginal, ...args }: OpenInspectorParams) => {
      // Validate arguments
      if (args.isReadonly === false && onSaveOriginal === undefined) {
        throw new Error(`A value for [onSave()] must be provided when [isReadonly] is false.`);
      }

      const onSave: OpenInspectorParams['onSave'] =
        onSaveOriginal &&
        (async (...onSaveArgs) => {
          await onSaveOriginal(...onSaveArgs);
          await postSaveHandler?.();
          closeFlyout();
        });

      flyout.current = openFlyout(
        <InspectorLoader {...args} onSave={onSave} onCancel={closeFlyout} services={services} />,
        {
          maxWidth: 600,
          size: 'm',
          ownFocus: true,
          hideCloseButton: true,
        }
      );
    },
    [closeFlyout, openFlyout, postSaveHandler, services]
  );
}
