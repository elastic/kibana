/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DesignExplorationNavSearchButton } from './design_exploration_nav_search_button';
import { DesignExplorationNavHelpButton } from './design_exploration_nav_help_button';
import { DesignExplorationNavUserMenu } from './design_exploration_nav_user_menu';

/** Search sits first in the footer (before solution footer items). */
export const DesignExplorationNavFooterLeadingControls = () => <DesignExplorationNavSearchButton />;

/** Help and profile sit after solution footer items. */
export const DesignExplorationNavFooterControls = () => (
  <>
    <DesignExplorationNavHelpButton />
    <DesignExplorationNavUserMenu />
  </>
);
