/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderBack, type AppHeaderMenu } from '@kbn/app-header';
import type { DataView } from '@kbn/data-views-plugin/public';

interface IndexHeaderProps {
  indexPattern: DataView;
  defaultIndex?: string;
  setDefault?: () => void;
  editIndexPatternClick?: () => void;
  deleteIndexPatternClick?: () => void;
  canSave: boolean;
  back?: AppHeaderBack;
}

const setDefaultTooltip = i18n.translate('indexPatternManagement.editDataView.setDefaultTooltip', {
  defaultMessage: 'Set as default',
});

const editTooltip = i18n.translate('indexPatternManagement.editDataView.editTooltip', {
  defaultMessage: 'Edit data view',
});

const removeTooltip = i18n.translate('indexPatternManagement.editDataView.removeTooltip', {
  defaultMessage: 'Delete data view',
});

export const IndexHeader: FC<PropsWithChildren<IndexHeaderProps>> = ({
  defaultIndex,
  indexPattern,
  setDefault,
  editIndexPatternClick,
  deleteIndexPatternClick,
  children,
  canSave,
  back,
}) => {
  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];

    if (defaultIndex !== indexPattern.id && setDefault && canSave && indexPattern.isPersisted()) {
      items.push({
        id: 'setDefault',
        label: setDefaultTooltip,
        iconType: 'star',
        testId: 'setDefaultIndexPatternButton',
        run: () => setDefault(),
      });
    }

    if (canSave && indexPattern.isPersisted() && deleteIndexPatternClick) {
      items.push({
        id: 'delete',
        label: removeTooltip,
        iconType: 'trash',
        testId: 'deleteIndexPatternButton',
        run: () => deleteIndexPatternClick(),
      });
    }

    const primaryActionItem =
      canSave && editIndexPatternClick
        ? {
            id: 'edit',
            label: editTooltip,
            iconType: 'pencil',
            testId: 'editIndexPatternButton',
            run: () => editIndexPatternClick(),
          }
        : undefined;

    if (!primaryActionItem && items.length === 0) {
      return undefined;
    }

    return {
      primaryActionItem,
      items: items.length ? items : undefined,
    };
  }, [
    canSave,
    defaultIndex,
    deleteIndexPatternClick,
    editIndexPatternClick,
    indexPattern,
    setDefault,
  ]);

  return (
    <>
      <AppHeader title={indexPattern.getName()} back={back} menu={menu} spacing="bleed" />
      <EuiSpacer size="l" />
      {children}
    </>
  );
};
