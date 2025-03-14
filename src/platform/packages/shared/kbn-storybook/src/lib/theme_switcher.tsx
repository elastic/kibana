/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { Icons, IconButton, TooltipLinkList, WithTooltip } from '@storybook/components';
import { useGlobals } from '@storybook/api';

import { DEFAULT_THEME, THEMES, THEME_TITLES } from './themes';

type PropsOf<T extends React.FC<any>> = T extends React.FC<infer P> ? P : never;
type ArrayItem<T extends any[]> = T extends Array<infer I> ? I : never;
type Link = ArrayItem<PropsOf<typeof TooltipLinkList>['links']>;

export function ThemeSwitcher() {
  const [{ euiTheme: selectedTheme }, updateGlobals] = useGlobals();

  const selectTheme = useCallback(
    (themeId: string) => {
      updateGlobals({ euiTheme: themeId });
    },
    [updateGlobals]
  );

  useEffect(() => {
    if (!selectedTheme) {
      selectTheme(DEFAULT_THEME);
    }
  }, [selectTheme, selectedTheme]);

  return (
    <WithTooltip
      placement="top"
      trigger="click"
      closeOnClick
      tooltip={({ onHide }) => (
        <ThemeSwitcherTooltip
          onHide={onHide}
          onChangeSelectedTheme={selectTheme}
          selectedTheme={selectedTheme}
        />
      )}
    >
      {/* @ts-ignore Remove when @storybook has moved to @emotion v11 */}
      <IconButton key="eui-theme" title="Change the EUI theme">
        <Icons icon={selectedTheme?.includes('dark') ? 'heart' : 'hearthollow'} />
      </IconButton>
    </WithTooltip>
  );
}

const ThemeSwitcherTooltip = React.memo(
  ({
    onHide,
    onChangeSelectedTheme,
    selectedTheme,
  }: {
    onHide: () => void;
    onChangeSelectedTheme: (themeId: string) => void;
    selectedTheme: string;
  }) => {
    const links = THEMES.map(
      (theme): Link => ({
        id: theme,
        title: THEME_TITLES[theme],
        onClick: (_event, item) => {
          if (item.id != null && item.id !== selectedTheme) {
            onChangeSelectedTheme(item.id);
          }
          onHide();
        },
        active: selectedTheme === theme,
      })
    );

    return <TooltipLinkList links={links} />;
  }
);
