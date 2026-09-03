/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderBack, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

interface HeaderProps {
  canDelete: boolean;
  canViewInApp: boolean;
  viewUrl: string;
  onDeleteClick: () => void;
  title?: string;
  back: AppHeaderBack;
}

export const Header = ({
  canDelete,
  canViewInApp,
  viewUrl,
  onDeleteClick,
  title,
  back,
}: HeaderProps) => {
  const objectTitle = title || 'saved object';

  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];

    if (canDelete) {
      items.push({
        id: 'delete',
        label: i18n.translate('savedObjectsManagement.view.deleteItemButtonLabel', {
          defaultMessage: 'Delete',
        }),
        iconType: 'trash',
        testId: 'savedObjectEditDelete',
        overflow: true,
        isDestructive: true,
        run: () => onDeleteClick(),
      });
    }

    const primaryActionItem = canViewInApp
      ? {
          id: 'viewInApp',
          label: i18n.translate('savedObjectsManagement.view.viewItemButtonLabel', {
            defaultMessage: 'View {title}',
            values: { title: objectTitle },
          }),
          iconType: 'eye',
          testId: 'savedObjectEditViewInApp',
          href: viewUrl,
        }
      : undefined;

    if (!primaryActionItem && items.length === 0) {
      return undefined;
    }

    return {
      primaryActionItem,
      items: items.length ? items : undefined,
    };
  }, [canDelete, canViewInApp, objectTitle, onDeleteClick, viewUrl]);

  return (
    <>
      <AppHeader
        title={i18n.translate('savedObjectsManagement.view.inspectItemTitle', {
          defaultMessage: 'Inspect {title}',
          values: { title: objectTitle },
        })}
        back={back}
        menu={menu}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
    </>
  );
};
