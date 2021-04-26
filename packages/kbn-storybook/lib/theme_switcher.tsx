/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Icons, IconButton, TooltipLinkList, WithTooltip } from '@storybook/components';
import { useGlobals } from '@storybook/api';
import { Link } from '@storybook/components/dist/tooltip/TooltipLinkList';

const defaultTheme = 'v8.light';

export function ThemeSwitcher() {
  const [globals, updateGlobals] = useGlobals();
  const selectedTheme = globals.euiTheme;

  if (!selectedTheme || selectedTheme === defaultTheme) {
    updateGlobals({ euiTheme: defaultTheme });
  }

  const links: Link[] = [
    {
      id: 'v8.light',
      title: 'Amsterdam: Light',
    },
    {
      id: 'v8.dark',
      title: 'Amsterdam: Dark',
    },
    { id: 'v7.light', title: 'Light' },
    { id: 'v7.dark', title: 'Dark' },
  ].map((link) => ({
    ...link,
    onClick: (_event, item) => {
      if (item.id !== selectedTheme) {
        updateGlobals({ euiTheme: item.id });
      }
    },
    active: selectedTheme === link.id,
  }));

  return (
    <WithTooltip
      placement="top"
      trigger="click"
      closeOnClick
      tooltip={() => <TooltipLinkList links={links} />}
    >
      <IconButton key="eui-theme" title="Change the EUI theme">
        <Icons icon="hearthollow" />
      </IconButton>
    </WithTooltip>
  );
}
