/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Icons, IconButton, TooltipLinkList, WithTooltip } from '@storybook/components';

export function ThemeSwitcher() {
  const links = [
    { id: 'v8.light', title: 'Amsterdam: Light', active: true },
    { id: 'v8.dark', title: 'Amsterdam: Dark' },
    { id: 'v7.light', title: 'Light' },
    { id: 'v7.dark', title: 'Dark' },
  ];

  return (
    <WithTooltip
      placement="top"
      trigger="click"
      closeOnClick
      tooltip={({ onHide }) => {
        return <TooltipLinkList links={links} />;
      }}
    >
      <IconButton key="eui-theme" title="Change the EUI theme">
        <Icons icon="hearthollow" />
      </IconButton>
    </WithTooltip>
  );
}
