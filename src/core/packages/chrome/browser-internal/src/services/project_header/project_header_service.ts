/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMenuConfigNext } from '@kbn/core-chrome-app-menu-components';
import { ReplaySubject } from 'rxjs';

interface StartDeps {
  setAppMenu: (config?: AppMenuConfigNext) => void;
}

export class ProjectHeaderService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start({ setAppMenu }: StartDeps) {
    return {
      setAppMenu: (config?: AppMenuConfigNext) => {
        setAppMenu(config);
      },
    };
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();
  }
}
