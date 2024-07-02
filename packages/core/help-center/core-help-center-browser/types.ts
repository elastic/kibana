/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { HelpTopic } from '@elastic/help-center-common';

export interface HelpCenterStart {
  helpTopics$: Observable<Record<string, HelpTopic>>;
  hasHelpTopics$: Observable<boolean>;
  version$: Observable<string | undefined>;
  helpCenterUrl$: Observable<string | undefined>;
}

export interface HelpCenterSetup {
  configure: (config: {
    helpCenterUrl: string;
    version: string;
    helpTopics?: Record<string, HelpTopic>;
  }) => void;
  addHelpTopics: (helpTopics: Record<string, HelpTopic>) => void;
  hasHelpTopics$: Observable<boolean>;
}
