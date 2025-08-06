/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

import { MountPoint } from '@kbn/core-mount-utils-browser';
import React, { useMemo } from 'react';
import { HeaderActionMenu, useHeaderActionMenuMounter } from '../header/header_action_menu';

interface AppMenuBarProps {
  // TODO: get rid of observable
  appMenuActions$: Observable<MountPoint | undefined>;

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
      background: euiTheme.colors.body,
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

export const AppMenuBar = ({ appMenuActions$, isFixed = true }: AppMenuBarProps) => {
  const headerActionMenuMounter = useHeaderActionMenuMounter(appMenuActions$);
  const { euiTheme } = useEuiTheme();

  const styles = useAppMenuBarStyles(euiTheme);

  if (!headerActionMenuMounter.mount) return null;

  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={[styles.root, isFixed ? styles.fixed : styles.static]}
    >
      <HeaderActionMenu mounter={headerActionMenuMounter} />
    </div>
  );
};
