/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { EsqlQuery } from '@kbn/esql-ast';

export class EsqlInspectorState {
  public readonly src$ = new BehaviorSubject<string>('FROM index | LIMIT 10');
  public readonly query$ = new BehaviorSubject<EsqlQuery | null>(null);
  public readonly queryLastValid$ = new BehaviorSubject<EsqlQuery | null>(EsqlQuery.fromSrc(''));

  constructor() {
    this.src$.subscribe((src) => {
      try {
        this.query$.next(EsqlQuery.fromSrc(src));
      } catch (e) {
        this.query$.next(null);
      }
    });

    this.query$.subscribe((query) => {
      if (query instanceof EsqlQuery) {
        this.queryLastValid$.next(query);
      }
    });
  }
}
