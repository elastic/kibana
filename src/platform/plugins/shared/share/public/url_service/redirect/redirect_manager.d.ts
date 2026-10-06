/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { Location } from 'history';
import type { BehaviorSubject } from 'rxjs';
import type { UrlService } from '../../../common/url_service';
import type { RedirectOptions } from '../../../common/url_service/locators/redirect';
export interface RedirectManagerDependencies {
  url: UrlService;
}
export declare class RedirectManager {
  readonly deps: RedirectManagerDependencies;
  readonly error$: BehaviorSubject<Error | null>;
  constructor(deps: RedirectManagerDependencies);
  registerLocatorRedirectApp(core: CoreSetup): void;
  registerLegacyShortUrlRedirectApp(core: CoreSetup): void;
  onMount(location: Location, abortSignal?: AbortSignal): void;
  private navigateToShortUrlBySlug;
  navigate(options: RedirectOptions): void;
  protected parseSearchParams(urlLocationSearch: string): RedirectOptions;
}
