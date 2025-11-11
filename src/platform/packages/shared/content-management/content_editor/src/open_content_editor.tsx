/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';

import { useServices } from './services';

import { ContentEditorLoader } from './components';
import type { ContentEditorFlyoutContentContainerProps } from './components';

export type OpenContentEditorParams = Pick<
  ContentEditorFlyoutContentContainerProps,
  | 'item'
  | 'onSave'
  | 'isReadonly'
  | 'readonlyReason'
  | 'entityName'
  | 'customValidators'
  | 'appendRows'
>;

export function useOpenContentEditor() {
  const services = useServices();
  const { openSystemFlyout } = services;
  const flyout = useRef<OverlayRef | null>(null);

  return useCallback(
    (args: OpenContentEditorParams) => {
      // Validate arguments: onSave must be provided if isReadonly is false
      if (args.isReadonly === false && args.onSave === undefined) {
        throw new Error(`A value for [onSave()] must be provided when [isReadonly] is false.`);
      }
      // Retrieve item title or use a default value
      let title = args.item.title;
      if (!args.item.title) {
        // eslint-disable-next-line no-console
        console.warn('Item title is missing. Using default title "Details - Untitled".');
        title = i18n.translate('contentManagement.contentEditor.defaultItemTitle', {
          defaultMessage: 'Details - Untitled',
        });
      }

      const closeFlyout = () => {
        flyout.current?.close();
      };

      flyout.current = openSystemFlyout(
        <ContentEditorLoader {...args} onCancel={closeFlyout} services={services} />,
        {
          title,
          maxWidth: 600,
          size: 'm',
          ownFocus: true,
          hideCloseButton: true,
        }
      );

      return closeFlyout;
    },
    [openSystemFlyout, services]
  );
}
