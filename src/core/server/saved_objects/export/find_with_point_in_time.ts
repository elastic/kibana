/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '../../logging';
import { SavedObjectsClientContract, SavedObjectsFindOptions } from '../types';
import { SavedObjectsFindResponse } from '../service';

/**
 * Returns a generator to help page through large sets of saved objects.
 *
 * The generator wraps calls to `SavedObjects.find` and iterates over
 * multiple pages of results using `_pit` and `search_after`. This will
 * open a new Point In Time (PIT), and continue paging until a set of
 * results is received that's smaller than the designated `perPage`.
 *
 * Once you have retrieved all of the results you need, it is recommended
 * to call `close()` to clean up the PIT and prevent Elasticsearch from
 * consuming resources unnecessarily. This will automatically be done for
 * you if you reach the last page of results.
 *
 * @example
 * ```ts
 * const finder = findWithPointInTime({
 *   logger,
 *   savedObjectsClient,
 * });
 *
 * const options: SavedObjectsFindOptions = {
 *   type: 'visualization',
 *   search: 'foo*',
 *   perPage: 100,
 * };
 *
 * const responses: SavedObjectFindResponse[] = [];
 * for await (const response of finder.find(options)) {
 *   responses.push(...response);
 *   if (doneSearching) {
 *     await finder.close();
 *   }
 * }
 * ```
 */
export function findWithPointInTime({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  return new FindWithPointInTime({ logger, savedObjectsClient });
}

/**
 * @internal
 */
export class FindWithPointInTime {
  readonly #log: Logger;
  readonly #savedObjectsClient: SavedObjectsClientContract;
  #open?: boolean;
  #perPage?: number;
  #pitId?: string;
  #type?: string | string[];

  constructor({
    savedObjectsClient,
    logger,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
  }) {
    this.#log = logger;
    this.#savedObjectsClient = savedObjectsClient;
  }

  async *find(options: SavedObjectsFindOptions) {
    this.#open = true;
    this.#type = options.type;
    // Default to 1000 items per page as a tradeoff between
    // speed and memory consumption.
    this.#perPage = options.perPage ?? 1000;

    const findOptions: SavedObjectsFindOptions = {
      ...options,
      perPage: this.#perPage,
      type: this.#type,
    };

    // Open PIT and request our first page of hits
    await this.open();

    let results = await this.findNext({ findOptions, id: this.#pitId });
    this.#pitId = results.pit_id;
    let lastResultsCount = results.saved_objects.length;
    let lastHitSortValue = this.getLastHitSortValue(results);

    this.#log.debug(`Collected [${lastResultsCount}] saved objects for export.`);

    // Close PIT if this was our last page
    if (this.#pitId && lastResultsCount < this.#perPage!) {
      await this.close();
    }

    yield results;

    // We've reached the end when there are fewer hits than our perPage size
    while (this.#open && lastHitSortValue && lastResultsCount === this.#perPage) {
      results = await this.findNext({
        findOptions,
        id: this.#pitId,
        searchAfter: lastHitSortValue,
      });

      lastResultsCount = results.saved_objects.length;
      lastHitSortValue = this.getLastHitSortValue(results);
      this.#pitId = results.pit_id;

      this.#log.debug(`Collected [${lastResultsCount}] more saved objects for export.`);

      if (this.#pitId && lastResultsCount < this.#perPage) {
        await this.close();
      }

      yield results;
    }

    return;
  }

  async close() {
    try {
      if (this.#pitId) {
        this.#log.debug(`Closing PIT for types [${this.#type}]`);
        await this.#savedObjectsClient.closePointInTime(this.#pitId);
        this.#pitId = undefined;
      }
      this.#type = undefined;
      this.#open = false;
    } catch (e) {
      this.#log.error(`Failed to close PIT for types [${this.#type}]`);
      throw e;
    }
  }

  private async open() {
    try {
      const { id } = await this.#savedObjectsClient.openPointInTimeForType(this.#type!);
      this.#pitId = id;
    } catch (e) {
      // Since `find` swallows 404s, it is expected that exporter will do the same,
      // so we only rethrow non-404 errors here.
      if (e.output.statusCode !== 404) {
        throw e;
      }
      this.#log.debug(`Unable to open PIT for types [${this.#type}]: 404 ${e}`);
    }
  }

  private async findNext({
    findOptions,
    id,
    searchAfter,
  }: {
    findOptions: SavedObjectsFindOptions;
    id?: string;
    searchAfter?: unknown[];
  }) {
    try {
      return await this.#savedObjectsClient.find({
        // Sort fields are required to use searchAfter, so we set some defaults here
        sortField: 'updated_at',
        sortOrder: 'desc',
        // Bump keep_alive by 2m on every new request to allow for the ES client
        // to make multiple retries in the event of a network failure.
        ...(id ? { pit: { keepAlive: '2m', ...findOptions.pit, id } } : {}),
        ...(searchAfter ? { searchAfter } : {}),
        ...findOptions,
      });
    } catch (e) {
      if (id) {
        // Clean up PIT on any errors.
        await this.close();
      }
      throw e;
    }
  }

  private getLastHitSortValue(res: SavedObjectsFindResponse) {
    return res.saved_objects.length && res.saved_objects[res.saved_objects.length - 1].sort;
  }
}
