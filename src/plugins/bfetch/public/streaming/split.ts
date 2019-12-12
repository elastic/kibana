/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable, Subject } from 'rxjs';

/**
 * Receives observable that emits strings, and returns a new observable
 * that also returns strings separated by delimiter.
 *
 * Input stream:
 *
 *     asdf.f -> df..aaa. -> dfsdf
 *
 * Output stream, assuming "." is used as delimiter:
 *
 *     asdf -> fdf -> aaa -> dfsdf
 *
 */
export const split = (splitter: string = '\n') => (in$: Observable<string>): Observable<string> => {
  const out$ = new Subject<string>();
  let startingText = '';

  in$.subscribe(
    chunk => {
      const parts = chunk.split(splitter);
      if (parts.length === 0) return;
      if (parts.length === 1) {
        startingText += chunk;
        return;
      }
      if (startingText || parts[0]) out$.next(startingText + parts[0]);
      for (let i = 1; i < parts.length - 1; i++) if (parts[i]) out$.next(parts[i]);
      startingText = parts[parts.length - 1];
    },
    out$.error.bind(out$),
    () => {
      if (startingText) out$.next(startingText);
      out$.complete();
    }
  );

  return out$;
};
