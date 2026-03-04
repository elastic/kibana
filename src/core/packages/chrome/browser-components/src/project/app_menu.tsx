/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

import React, { useMemo } from 'react';
import { HeaderAppMenu } from '../shared/header_app_menu';
import { HeaderActionMenu, useHeaderActionMenuMounter } from '../shared/header_action_menu';
import { useHasAppMenuConfig } from '../shared/use_has_app_menu_config';
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

export const AppMenuBar = () => {
  const headerActionMenuMounter = useHeaderActionMenuMounter();
  const { euiTheme } = useEuiTheme();

  const styles = useAppMenuBarStyles(euiTheme);

  const hasBetaConfig = useHasAppMenuConfig();

  if (!headerActionMenuMounter.mount && !hasBetaConfig) return null;

  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={styles.root}
    >
      {hasBetaConfig ? <HeaderAppMenu /> : <HeaderActionMenu mounter={headerActionMenuMounter} />}
    </div>
  );
};
