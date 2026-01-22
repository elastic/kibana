/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { map, EMPTY } from 'rxjs';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

import type { MountPoint } from '@kbn/core-mount-utils-browser';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { HeaderAppMenu } from '../header/header_app_menu';
import { HeaderActionMenu, useHeaderActionMenuMounter } from '../header/header_action_menu';

interface AppMenuBarProps {
  // TODO: get rid of observable
  appMenuActions$?: Observable<MountPoint | undefined> | null;
  appMenu$: Observable<AppMenuConfig | undefined>;

  /**
   * Whether the menu bar should be fixed (sticky) or static.
   */
  isFixed?: boolean;
}

const useAppMenuBarStyles = (euiTheme: UseEuiTheme['euiTheme']) =>
  useMemo(() => {
    const zIndex =
      typeof euiTheme.levels.header === 'number'
        ? euiTheme.levels.header - 10 // Appear right below the header
        : euiTheme.levels.header;

    // Root bar styles
    const root = {
      display: 'flex',
      justifyContent: 'end',
      alignItems: 'center',
      padding: `0 ${euiTheme.size.s}`,
      background: euiTheme.colors.backgroundBasePlain,
      borderBottom: euiTheme.border.thin,
      marginBottom: `-${euiTheme.border.width.thin}`,
    };
    // Styles for fixed (sticky) mode
    const fixed = {
      zIndex,
      position: 'sticky', // Fixates the element in the viewport
      top: 'var(--euiFixedHeadersOffset, 0)', // Below primary fixed EuiHeader
      height: `var(--kbnProjectHeaderAppActionMenuHeight, ${euiTheme.size.xxxl})`,
    };
    // Styles for static mode
    const staticStyle = {
      height: '100%',
    };
    return { root, fixed, static: staticStyle };
  }, [euiTheme]);

export const AppMenuBar = ({ appMenuActions$, appMenu$, isFixed = true }: AppMenuBarProps) => {
  const headerActionMenuMounter = useHeaderActionMenuMounter(appMenuActions$ ?? EMPTY);
  const { euiTheme } = useEuiTheme();

  const styles = useAppMenuBarStyles(euiTheme);

  const hasBeta$ = useMemo(
    () =>
      appMenu$?.pipe(map((config) => !!config && !!config.items && config.items.length > 0)) ??
      EMPTY,
    [appMenu$]
  );
  const hasBetaConfig = useObservable(hasBeta$, false);

  if (!headerActionMenuMounter.mount && !hasBetaConfig) return null;

  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={[styles.root, isFixed ? styles.fixed : styles.static]}
    >
      {hasBetaConfig ? (
        <HeaderAppMenu config={appMenu$} />
      ) : (
        <HeaderActionMenu mounter={headerActionMenuMounter} />
      )}
    </div>
  );
};
