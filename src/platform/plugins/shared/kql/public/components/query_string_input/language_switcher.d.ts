/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PopoverAnchorPosition } from '@elastic/eui';
import type React from 'react';
import type { DocLinksStart } from '@kbn/core/public';
export declare const strings: {
  getSwitchLanguageButtonText: () => string;
  getFilterLanguageLabel: () => string;
  documentationLabel: () => string;
};
export interface QueryLanguageSwitcherProps {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
  nonKqlMode?: 'lucene' | 'text';
  isOnTopBarMenu?: boolean;
  isDisabled?: boolean;
  deps: {
    docLinks: DocLinksStart;
  };
}
export declare const QueryLanguageSwitcher: React.NamedExoticComponent<QueryLanguageSwitcherProps>;
