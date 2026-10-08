/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { AppHeaderShareAction, AppHeaderTitle } from '@kbn/app-header';
import { DiscoverAppHeader } from '@kbn/app-header/discover';
import { AppMenuActionId } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { getChromeHeaderBack, getChromeHeaderTitle } from './utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useIsProjectChromeStyle } from './use_is_project_chrome_style';

interface ChromeAppHeaderProps {
  menu?: AppMenuConfig;
  share?: AppHeaderShareAction;
  tabsBar?: ReactNode;
}

export const ChromeAppHeader = ({ menu, share, tabsBar }: ChromeAppHeaderProps) => {
  const { capabilities, embeddableEditor } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const isProjectChromeStyle = useIsProjectChromeStyle();
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const draftSessionTitle = useInternalStateSelector((state) => state.draftSessionTitle);
  const sessionTitle = persistedDiscoverSession?.title ?? draftSessionTitle;
  const canRenameSession = Boolean(
    capabilities.discover_v2.save &&
      !persistedDiscoverSession?.managed &&
      !embeddableEditor.isEmbeddedEditor()
  );

  const title = useMemo((): AppHeaderTitle => {
    const text = getChromeHeaderTitle({ embeddableEditor, sessionTitle });

    if (!canRenameSession) {
      return text;
    }

    return {
      text,
      ariaLabel: i18n.translate('discover.appHeader.renameSessionAriaLabel', {
        defaultMessage: 'Edit Discover session name',
      }),
      onSave: async (newTitle) => {
        try {
          await dispatch(internalStateActions.renameDiscoverSession({ newTitle })).unwrap();
        } catch {
          return i18n.translate('discover.appHeader.renameSessionErrorMessage', {
            defaultMessage: 'Unable to rename Discover session',
          });
        }
      },
    };
  }, [canRenameSession, dispatch, embeddableEditor, sessionTitle]);

  const back = useMemo(() => {
    return getChromeHeaderBack(embeddableEditor);
  }, [embeddableEditor]);

  const appMenu = useMemo(() => {
    // Share is surfaced as the title-row action but also kept in the overflow menu. Sharing is
    // effectively session-scoped (not tab-scoped), so per design it belongs in the first section
    // right below "New session"/"Open" rather than leading the tab-scoped section. The fractional
    // offset keeps share adjacent-below "New session" without colliding with any order.
    const newSessionItem = menu?.items?.find((item) => item.id === AppMenuActionId.new);

    return {
      ...menu,
      items: menu?.items?.map((item) => {
        // We need more space for the tabs as the title is now in the same row. Move all items to the
        // overflow menu. (Except switch language)
        const overflow = item.id !== AppMenuActionId.switchLanguageMode;

        if (item.id === AppMenuActionId.share && newSessionItem) {
          return {
            ...item,
            overflow,
            order: (newSessionItem.order ?? 0) + 0.5,
          } as AppMenuItemType;
        }

        return { ...item, overflow } as AppMenuItemType;
      }),
    };
  }, [menu]);

  if (!isProjectChromeStyle) {
    return null;
  }

  return (
    <div // Wrap needed to keep the header border visible when tabs not shown.
      css={css`
        position: relative;
      `}
    >
      <DiscoverAppHeader
        title={title}
        back={back}
        menu={appMenu}
        share={share}
        sticky={false}
        spacing="compact"
        tabsBar={tabsBar}
      />
    </div>
  );
};
