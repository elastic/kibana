/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiButtonIcon, EuiCollapsibleNav, EuiThemeProvider, useEuiTheme } from '@elastic/eui';

const LOCAL_STORAGE_IS_OPEN_KEY = 'PROJECT_NAVIGATION_OPEN' as const;

export const ProjectNavigation: React.FC = ({ children }) => {
  const { euiTheme, colorMode } = useEuiTheme();

  const [isOpen, setIsOpen] = useLocalStorage(LOCAL_STORAGE_IS_OPEN_KEY, true);

  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  return (
    <EuiThemeProvider colorMode={colorMode === 'DARK' ? 'LIGHT' : 'DARK'}>
      <EuiCollapsibleNav
        css={{
          borderInlineEndWidth: 1,
          background: euiTheme.colors.darkestShade,
          display: 'flex',
          flexDirection: 'row',
        }}
        isOpen={true}
        showButtonIfDocked={true}
        onClose={toggleOpen}
        isDocked={true}
        size={isOpen ? 248 : 40}
        hideCloseButton={false}
        button={
          <span css={{ marginLeft: -32, marginTop: 27, position: 'fixed', zIndex: 1000 }}>
            <EuiButtonIcon
              iconType={isOpen ? 'menuLeft' : 'menuRight'}
              aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
              color="text"
              onClick={toggleOpen}
            />
          </span>
        }
      >
        {isOpen && children}
      </EuiCollapsibleNav>
    </EuiThemeProvider>
  );
};
