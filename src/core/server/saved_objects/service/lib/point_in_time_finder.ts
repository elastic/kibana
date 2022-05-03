/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger } from '../../../logging';
import type { SavedObjectsFindOptions, SavedObjectsClientContract } from '../../types';
import type { SavedObjectsFindResponse } from '..';

type PointInTimeFinderClient = Pick<
  SavedObjectsClientContract,
  'find' | 'openPointInTimeForType' | 'closePointInTime'
>;

/**
 * @public
 */
export type SavedObjectsCreatePointInTimeFinderOptions = Omit<
  SavedObjectsFindOptions,
  'page' | 'pit' | 'searchAfter'
>;

/**
 * @public
 */
export interface SavedObjectsCreatePointInTimeFinderDependencies {
  client: Pick<SavedObjectsClientContract, 'find' | 'openPointInTimeForType' | 'closePointInTime'>;
}

/**
 * @internal
 */
export interface PointInTimeFinderDependencies
  extends SavedObjectsCreatePointInTimeFinderDependencies {
  logger: Logger;
}

/**
 * @internal
 */
export type CreatePointInTimeFinderFn = <T = unknown, A = unknown>(
  findOptions: SavedObjectsCreatePointInTimeFinderOptions
) => ISavedObjectsPointInTimeFinder<T, A>;

/** @public */
export interface ISavedObjectsPointInTimeFinder<T, A> {
  /**
   * An async generator which wraps calls to `savedObjectsClient.find` and
   * iterates over multiple pages of results using `_pit` and `search_after`.
   * This will open a new Point-In-Time (PIT), and continue paging until a set
   * of results is received that's smaller than the designated `perPage` size.
   */
  find: () => AsyncGenerator<SavedObjectsFindResponse<T, A>>;
  /**
   * Closes the Point-In-Time associated with this finder instance.
   *
   * Once you have retrieved all of the results you need, it is recommended
   * to call `close()` to clean up the PIT and prevent Elasticsearch from
   * consuming resources unnecessarily. This is only required if you are
   * done iterating and have not yet paged through all of the results: the
   * PIT will automatically be closed for you once you reach the last page
   * of results, or if the underlying call to `find` fails for any reason.
   */
  close: () => Promise<void>;
}

/**
 * @internal
 */
export class PointInTimeFinder<T = unknown, A = unknown>
  implements ISavedObjectsPointInTimeFinder<T, A>
{
  readonly #log: Logger;
  readonly #client: PointInTimeFinderClient;
  readonly #findOptions: SavedObjectsFindOptions;
  #open: boolean = false;
  #pitId?: string;

  constructor(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    { logger, client }: PointInTimeFinderDependencies
  ) {
    this.#log = logger.get('point-in-time-finder');
    this.#client = client;
    this.#findOptions = {
      // Default to 1000 items per page as a tradeoff between
      // speed and memory consumption.
      perPage: 1000,
      ...findOptions,
    };
  }

  async *find() {
    if (this.#open) {
      throw new Error(
        'Point In Time has already been opened for this finder instance. ' +
          'Please call `close()` before calling `find()` again.'
      );
    }

    // Open PIT and request our first page of hits
    await this.open();

    let lastResultsCount: number;
    let lastHitSortValue: estypes.Id[] | undefined;
    do {
      const results = await this.findNext({
        findOptions: this.#findOptions,
        id: this.#pitId,
        searchAfter: lastHitSortValue,
      });
      this.#pitId = results.pit_id;
      lastResultsCount = results.saved_objects.length;
      lastHitSortValue = this.getLastHitSortValue(results);

      this.#log.debug(`Collected [${lastResultsCount}] saved objects`);

      // Close PIT if this was our last page
      if (this.#pitId && lastResultsCount < this.#findOptions.perPage!) {
        await this.close();
      }

      yield results;
      // We've reached the end when there are fewer hits than our perPage size,
      // or when `close()` has been called.
    } while (this.#open && lastResultsCount >= this.#findOptions.perPage!);

    return;
  }

  async close() {
    try {
      if (this.#pitId) {
        this.#log.debug(`Closing PIT for types [${this.#findOptions.type}]`);
        await this.#client.closePointInTime(this.#pitId);
        this.#pitId = undefined;
      }
      this.#open = false;
    } catch (e) {
      this.#log.error(`Failed to close PIT for types [${this.#findOptions.type}]`);
      throw e;
    }
  }

  private async open() {
    try {
      const { id } = await this.#client.openPointInTimeForType(this.#findOptions.type, {
        namespaces: this.#findOptions.namespaces,
      });
      this.#pitId = id;
      this.#open = true;
    } catch (e) {
      // Since `find` swallows 404s, it is expected that finder will do the same,
      // so we only rethrow non-404 errors here.
      if (e.output?.statusCode !== 404) {
        this.#log.error(`Failed to open PIT for types [${this.#findOptions.type}]`);
        throw e;
      }
      this.#log.debug(`Unable to open PIT for types [${this.#findOptions.type}]: 404 ${e}`);
    }
  }

  private async findNext({
    findOptions,
    id,
    searchAfter,
  }: {
    findOptions: SavedObjectsFindOptions;
    id?: string;
    searchAfter?: estypes.Id[];
  }) {
    try {
      return await this.#client.find<T, A>({
        // Sort fields are required to use searchAfter, so we set some defaults here
        sortField: 'updated_at',
        sortOrder: 'desc',
        // Bump keep_alive by 2m on every new request to allow for the ES client
        // to make multiple retries in the event of a network failure.
        pit: id ? { id, keepAlive: '2m' } : undefined,
        searchAfter,
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

  private getLastHitSortValue(res: SavedObjectsFindResponse): estypes.Id[] | undefined {
    if (res.saved_objects.length < 1) {
      return undefined;
    }
    return res.saved_objects[res.saved_objects.length - 1].sort;
  }
}
