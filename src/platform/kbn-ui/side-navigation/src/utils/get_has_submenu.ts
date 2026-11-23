/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem } from '../../types';
import { getPopoverSections } from './get_menu_item_sections';

/**
 * Whether the hover popover has content.
 */
export const getHasSubmenu = (item: MenuItem): boolean => {
  return (getPopoverSections(item)?.length ?? 0) > 0;
};

/**
 * Nested submenu in More. Structural `sections` only — supplementary sections stay out.
 */
export const getHasMoreSubmenu = (item: MenuItem): boolean => (item.sections?.length ?? 0) > 0;
