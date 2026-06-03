/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ChromeNextGlobalHeaderLogo } from './global_header_logo';
import { SearchButton } from './search_button';
import { HelpButton } from './help_button';
import { ChromeNextGlobalHeaderShell } from './global_header_shell';
import { useContextSwitcher, useUserMenu } from '../../shared/chrome_hooks';

export const ChromeNextGlobalHeader = React.memo(() => (
  <ChromeNextGlobalHeaderShell
    logo={<ChromeNextGlobalHeaderLogo />}
    search={<SearchButton />}
    help={<HelpButton />}
    switcher={useContextSwitcher()}
    userMenu={useUserMenu()}
  />
));

ChromeNextGlobalHeader.displayName = 'ChromeNextGlobalHeader';
