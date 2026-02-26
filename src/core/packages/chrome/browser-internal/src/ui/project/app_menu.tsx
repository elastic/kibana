/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { EMPTY } from 'rxjs';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

import type { MountPoint } from '@kbn/core-mount-utils-browser';
import React, { useMemo } from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { HeaderAppMenu } from '../header/header_app_menu';
import { HeaderActionMenu, useHeaderActionMenuMounter } from '../header/header_action_menu';
import { useHasAppMenuConfig } from '../use_has_app_menu_config';

interface AppMenuBarProps {
  // TODO: get rid of observable
  appMenuActions$?: Observable<MountPoint | undefined> | null;
  appMenu$: Observable<AppMenuConfig | undefined>;
}

const useAppMenuBarStyles = (euiTheme: UseEuiTheme['euiTheme']) =>
  useMemo(() => {
    // Root bar styles
    const root = {
      display: 'flex',
      justifyContent: 'end',
      alignItems: 'center',
      padding: `0 ${euiTheme.size.s}`,
      background: euiTheme.colors.backgroundBasePlain,
      borderBottom: euiTheme.border.thin,
      marginBottom: `-${euiTheme.border.width.thin}`,
      height: '100%',
    };

    return { root };
  }, [euiTheme]);

export const AppMenuBar = ({ appMenuActions$, appMenu$ }: AppMenuBarProps) => {
  const headerActionMenuMounter = useHeaderActionMenuMounter(appMenuActions$ ?? EMPTY);
  const { euiTheme } = useEuiTheme();

  const styles = useAppMenuBarStyles(euiTheme);

  const hasBetaConfig = useHasAppMenuConfig(appMenu$);

  if (!headerActionMenuMounter.mount && !hasBetaConfig) return null;

  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={styles.root}
    >
      {hasBetaConfig ? (
        <HeaderAppMenu config={appMenu$} />
      ) : (
        <HeaderActionMenu mounter={headerActionMenuMounter} />
      )}
    </div>
  );
};
