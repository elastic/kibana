/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ChromeHeaderLogo } from './header_logo';
import { SearchButton } from '../shared/search_button';
import { AiButtonSlot } from '../shared/ai_button_slot';
import { HelpButton } from '../shared/help_button';
import { ChromeHeaderShell } from './header_shell';
import { useContextSwitcher, useProjectPicker, useUserMenu } from '../shared/chrome_hooks';
import { ChromeHeaderPageAnnouncer } from '../shared/header_page_announcer';

export const ChromeHeader = React.memo(() => {
  return (
    <>
      <ChromeHeaderPageAnnouncer />
      <ChromeHeaderShell
        logo={<ChromeHeaderLogo />}
        search={<SearchButton />}
        actions={<AiButtonSlot />}
        help={<HelpButton />}
        switcher={useContextSwitcher()}
        projectPicker={useProjectPicker()}
        userMenu={useUserMenu()}
      />
    </>
  );
});

ChromeHeader.displayName = 'ChromeHeader';
