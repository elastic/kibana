/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import {
  BehaviorSubject,
  Observable,
  Subject,
  debounceTime,
  filter,
  from,
  scan,
  shareReplay,
  switchMap,
} from 'rxjs';

const BUFFER_TIMEOUT_MS = 5000; // 5 seconds

interface DocUpdate {
  id?: string;
  value: Record<string, any>;
}

type Action = { type: 'add'; payload: DocUpdate } | { type: 'undo' };

export class IndexUpdateService {
  constructor(private readonly http: HttpStart) {
    this.listenForUpdates();
  }

  private indexName: string | null = null;

  private readonly scheduledUpdates$ = new BehaviorSubject<DocUpdate[]>([]);

  private readonly undoChangeSubject$ = new Subject<number>();

  private readonly actions$ = new Subject<Action>();

  // Accumulate updates in buffer with undo
  private bufferState$: Observable<DocUpdate[]> = this.actions$.pipe(
    scan((acc: DocUpdate[], action: Action) => {
      if (action.type === 'add') {
        return [...acc, action.payload];
      } else if (action.type === 'undo') {
        return acc.slice(0, -1); // remove last
      } else {
        return acc;
      }
    }, []),
    shareReplay(1) // keep latest buffer for retries
  );

  private listenForUpdates() {
    this.bufferState$
      .pipe(
        debounceTime(BUFFER_TIMEOUT_MS),
        filter((updates) => updates.length > 0),
        switchMap((updates) => {
          // Make your API call here with `updates`
          return from(
            // TODO create an API endpoint for bulk updates
            this.http.post(`/api/console/proxy`, {
              query: {
                path: `/${this.indexName}/_bulk`,
                method: 'POST',
              },
              body:
                updates
                  .map((update) => {
                    if (update.id) {
                      return `{"update": {"_id": "${update.id}"}}\n${JSON.stringify({
                        doc: update.value,
                      })}`;
                    }
                    return `{"index": {}}\n${JSON.stringify(update.value)}`;
                  })
                  .join('\n') + '\n', // NDJSON format requires a newline at the end
              headers: {
                'Content-Type': 'application/x-ndjson',
              },
            })
          );
        })
      )
      .subscribe({
        next: (response) => {
          console.log('API response:', response);
        },
        error: (err) => {
          // TODO handle API errors
          console.error('API error:', err);
        },
      });
  }

  public setIndexName(indexName: string) {
    if (false) {
      // TODO check if index is already created
      throw new Error(`Index with name ${indexName} already exists.`);
    }
    this.indexName = indexName;
  }

  // Add a new index
  public addDoc(doc: Record<string, any>) {
    this.actions$.next({ type: 'add', payload: { value: doc } });
  }

  /* Partial doc update */
  public updateDoc(id: string, update: Record<string, any>) {
    this.actions$.next({ type: 'add', payload: { id, value: update } });
  }

  /**
   * Cancel the latest update operation.
   */
  public undo() {
    this.actions$.next({ type: 'undo' });
  }

  public destroy() {
    this.scheduledUpdates$.complete();
    this.undoChangeSubject$.complete();
  }
}
