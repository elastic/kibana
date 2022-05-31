/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { ReactNode } from 'react';
import { BehaviorSubject, first, firstValueFrom } from 'rxjs';
import { EuiBasicTableColumn } from '@elastic/eui';
import { HttpSetup } from '@kbn/core/public';

import { withApiBaseBath } from '../../common';
import { GetUserContentTableColumnsDefinitionsOptions } from '../types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserContent {}

interface Dependencies {
  http: HttpSetup;
}

export class UserContentService {
  private http: HttpSetup | undefined;
  private contents = new BehaviorSubject({
    isLoaded: false,
    map: new Map<string, UserContent>(),
  });

  init({ http }: Dependencies) {
    this.http = http;

    // Fetch "user generated contents" types declared on the server
    this.fetchUserContentTypes()
      .then((contentTypes) => {
        const userContent = new Map<string, UserContent>();
        contentTypes.forEach((type) => {
          userContent.set(type, {});
        });
        this.contents.next({ isLoaded: true, map: userContent });
      })
      .catch((e) => {
        // TODO: error handling when types could not be fetched
      });
  }

  public async getUserContents() {
    const contents = await firstValueFrom(this.contents.pipe(first(({ isLoaded }) => isLoaded)));
    return contents.map;
  }

  public async getUserContentTypes(): Promise<string[]> {
    const userContents = await this.getUserContents();

    return [...userContents.keys()];
  }

  /**
   * Get the table column for user generated content
   *
   * @param options Options to return the column
   * @returns EuiBasicTableColumn definition to be used in EuiMemoryTable
   */
  public async getUserContentTableColumnsDefinitions({
    contentType,
    selectedViewsRange,
  }: GetUserContentTableColumnsDefinitionsOptions): Promise<
    Array<EuiBasicTableColumn<Record<string, unknown>>>
  > {
    const userContents = await this.getUserContents();

    if (!userContents.has(contentType)) {
      return [];
    }

    const viewsCountColumn: EuiBasicTableColumn<Record<string, unknown>> = {
      field: selectedViewsRange,
      name: 'Views',
      render: (field: string, record: Record<string, unknown>) => (
        <span>{record[selectedViewsRange] as ReactNode}</span>
      ),
      sortable: true,
    };

    return [viewsCountColumn];
  }

  private async fetchUserContentTypes(): Promise<string[]> {
    if (!this.http) {
      throw new Error(`UserContentService not initialized.`);
    }
    return this.http.get<string[]>(withApiBaseBath(`/user_content_types`));
  }
}
