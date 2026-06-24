/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ChromeNextGlobalHeaderLogo } from '../chrome_next/global_header/global_header_logo';
import { SearchButton } from '../chrome_next/global_header/search_button';
import { AiButtonSlot } from '../chrome_next/global_header/ai_button_slot';
import { HelpButton } from '../chrome_next/global_header/help_button';
import { ChromeNextGlobalHeaderShell } from '../chrome_next/global_header/global_header_shell';
import { useContextSwitcher, useUserMenu } from '../shared/chrome_hooks';

export interface AgentFirstGlobalHeaderProps {
  showLogo?: boolean;
  showSwitcher?: boolean;
  showSearch?: boolean;
  showHelp?: boolean;
  showUserMenu?: boolean;
  showActions?: boolean;
}

export const AgentFirstGlobalHeader = ({
  showLogo = true,
  showSwitcher = true,
  showSearch = true,
  showHelp = true,
  showUserMenu: showUserMenuSlot = true,
  showActions = true,
}: AgentFirstGlobalHeaderProps) => {
  const switcher = useContextSwitcher();
  const userMenu = useUserMenu();

  return (
    <ChromeNextGlobalHeaderShell
      logo={showLogo ? <ChromeNextGlobalHeaderLogo /> : undefined}
      search={showSearch ? <SearchButton /> : undefined}
      actions={showActions ? <AiButtonSlot /> : undefined}
      help={showHelp ? <HelpButton /> : undefined}
      switcher={showSwitcher ? switcher : undefined}
      userMenu={showUserMenuSlot ? userMenu : undefined}
    />
  );
};
