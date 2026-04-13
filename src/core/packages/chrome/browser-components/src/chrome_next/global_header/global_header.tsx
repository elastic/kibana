/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { GlobalHeaderShell } from './global_header_shell';
import { GlobalHeaderLogo } from './global_header_logo';
import { AiButtonSlot } from './ai_button_slot';
import { HelpButton } from './help_button';
import { useUserMenu } from '../../shared/chrome_hooks';

export const GlobalHeader = React.memo(() => (
  <GlobalHeaderShell
    logo={<GlobalHeaderLogo />}
    help={<HelpButton />}
    actions={<AiButtonSlot />}
    userMenu={useUserMenu()}
  />
));

GlobalHeader.displayName = 'GlobalHeader';
