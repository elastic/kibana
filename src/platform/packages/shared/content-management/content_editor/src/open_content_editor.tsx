/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useGeneratedHtmlId } from '@elastic/eui';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

import { useServices } from './services';

import { ContentEditorLoader } from './components';
import type { ContentEditorFlyoutContentContainerProps } from './components';

const capitalize = (str: string) => `${str.charAt(0).toLocaleUpperCase()}${str.substring(1)}`;

const getFlyoutTitle = ({ entityName }: { entityName: string }) =>
  capitalize(
    i18n.translate('contentManagement.contentEditor.flyoutTitle', {
      defaultMessage: '{entityName} details',
      values: {
        entityName,
      },
    })
  );

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
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'contentEditorFlyoutTitle' });

  return useCallback(
    (args: OpenContentEditorParams) => {
      // Validate arguments
      if (args.isReadonly === false && args.onSave === undefined) {
        throw new Error(`A value for [onSave()] must be provided when [isReadonly] is false.`);
      }

      const closeFlyout = () => {
        flyout.current?.close();
      };

      const flyoutTitle = getFlyoutTitle({ entityName: args.entityName });

      flyout.current = openSystemFlyout(
        <ContentEditorLoader
          {...args}
          flyoutTitle={flyoutTitle}
          flyoutTitleId={flyoutTitleId}
          services={services}
        />,
        {
          'aria-labelledby': flyoutTitleId,
          title: flyoutTitle,
          maxWidth: 600,
          size: 'm',
          ownFocus: true,
          onClose: closeFlyout,
          closeButtonProps: {
            'data-test-subj': 'closeFlyoutButton',
          },
        }
      );

      return closeFlyout;
    },
    [openSystemFlyout, services, flyoutTitleId]
  );
}
