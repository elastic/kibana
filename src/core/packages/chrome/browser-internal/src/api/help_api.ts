/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type {
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
} from '@kbn/core-chrome-browser';
import type { ChromeState } from '../state/chrome_state';

export interface HelpApi {
  getHelpExtension$: () => Observable<ChromeHelpExtension | undefined>;
  setHelpExtension: (extension?: ChromeHelpExtension) => void;
  getHelpSupportUrl$: () => Observable<string>;
  setHelpSupportUrl: (url: string) => void;
  getGlobalHelpExtensionMenuLinks$: () => Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  registerGlobalHelpExtensionMenuLink: (link: ChromeGlobalHelpExtensionMenuLink) => void;
  setHelpMenuLinks: (links: ChromeHelpMenuLink[]) => void;
}

export interface HelpApiDeps {
  state: ChromeState;
  setHelpMenuLinks: (links: ChromeHelpMenuLink[]) => void;
}

export function createHelpApi({ state, setHelpMenuLinks }: HelpApiDeps): HelpApi {
  return {
    getHelpExtension$: () => state.help.extension.$,
    setHelpExtension: state.help.extension.set,
    getHelpSupportUrl$: () => state.help.supportUrl.$,
    setHelpSupportUrl: state.help.supportUrl.set,
    getGlobalHelpExtensionMenuLinks$: () => state.help.globalMenuLinks.$,
    registerGlobalHelpExtensionMenuLink: (link) => {
      state.help.globalMenuLinks.add(link);
    },
    setHelpMenuLinks,
  };
}
