/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import { ChromeNavLinks, ChromeProjectNavigation } from '@kbn/core-chrome-browser';
import { BehaviorSubject } from 'rxjs';

interface StartDeps {
  application: InternalApplicationStart;
  navLinks: ChromeNavLinks;
}

export class ProjectNavigationService {
  public start({ application, navLinks }: StartDeps) {
    const projectNavigation$ = new BehaviorSubject<ChromeProjectNavigation | undefined>(undefined);
    // using application, navLink and projectNavigation$ keep track of navigation tree

    return {
      setProjectNavigation(projectNavigation: ChromeProjectNavigation) {
        projectNavigation$.next(projectNavigation);
      },
      getProjectNavigation() {
        return projectNavigation$.getValue();
      },
    };
  }
}
