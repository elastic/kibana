/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { ESQLCommand, EsqlQuery, Walker } from '@kbn/esql-ast';
import { ESQLProperNode } from '@kbn/esql-ast/src/types';
import { Annotation } from '../annotations';
import { highlight } from './helpers';

const defaultSrc = `FROM kibana_sample_data_logs, another_index
  | KEEP bytes, clientip, url.keyword, response.keyword
  | STATS Visits = COUNT(), Unique = COUNT_DISTINCT(clientip),
      p95 = PERCENTILE(bytes, 95), median = MEDIAN(bytes)
        BY type, url.keyword
  | EVAL total_records = TO_DOUBLE(count_4xx + count_5xx + count_rest)
  | DROP count_4xx, count_rest, total_records
  | LIMIT 123`;

export class EsqlInspectorState {
  public readonly src$ = new BehaviorSubject<string>(defaultSrc);
  public readonly query$ = new BehaviorSubject<EsqlQuery | null>(null);
  public readonly queryLastValid$ = new BehaviorSubject<EsqlQuery | null>(EsqlQuery.fromSrc(''));
  public readonly highlight$ = new BehaviorSubject<Annotation[]>([]);
  public readonly from$ = new BehaviorSubject<ESQLCommand | null>(null);
  public readonly limit$ = new BehaviorSubject<ESQLCommand | null>(null);
  public readonly focusedNode$ = new BehaviorSubject<ESQLProperNode | null>(null);

  constructor() {
    this.src$.subscribe((src) => {
      this.focusedNode$.next(null);
      try {
        this.query$.next(EsqlQuery.fromSrc(src, { withFormatting: true }));
      } catch (e) {
        this.query$.next(null);
      }
    });

    this.query$.subscribe((query) => {
      if (query instanceof EsqlQuery) {
        this.queryLastValid$.next(query);

        this.highlight$.next(highlight(query));

        const from = Walker.match(query?.ast, {
          type: 'command',
          name: 'from',
        });

        if (from) {
          this.from$.next(from as ESQLCommand);
        } else {
          this.from$.next(null);
        }

        const limit = Walker.match(query?.ast, {
          type: 'command',
          name: 'limit',
        });

        if (limit) {
          this.limit$.next(limit as ESQLCommand);
        } else {
          this.limit$.next(null);
        }
      }
    });
  }

  public readonly reprint = () => {
    const query = this.query$.getValue();

    if (!query) {
      return;
    }

    const src = query.print();
    this.src$.next(src);
  };
}
