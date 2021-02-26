/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '../../../logging';
import { SavedObjectsFindOptions } from '../../types';
import { SavedObjectsFindResponse } from '../';
import { ISavedObjectsRepository } from './repository';

/**
 * @internal
 */
export interface SavedObjectsPointInTimeFinderOptions {
  findOptions: Omit<SavedObjectsFindOptions, 'page' | 'pit' | 'searchAfter'>;
  logger: Logger;
  savedObjectsRepository: ISavedObjectsRepository;
}

/**
 * @internal
 */
export function createPointInTimeFinder({
  findOptions,
  logger,
  savedObjectsRepository,
}: SavedObjectsPointInTimeFinderOptions) {
  return new PointInTimeFinder({ findOptions, logger, savedObjectsRepository });
}

/**
 * @internal
 */
export class PointInTimeFinder {
  readonly #log: Logger;
  readonly #savedObjectsRepository: ISavedObjectsRepository;
  readonly #findOptions: SavedObjectsFindOptions;
  #open: boolean = false;
  #pitId?: string;

  constructor({
    findOptions,
    logger,
    savedObjectsRepository,
  }: SavedObjectsPointInTimeFinderOptions) {
    this.#log = logger.get('point-in-time-finder');
    this.#savedObjectsRepository = savedObjectsRepository;
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
    let lastHitSortValue: unknown[] | undefined;
    do {
      const results = await this.findNext({
        findOptions: this.#findOptions,
        id: this.#pitId,
        ...(lastHitSortValue ? { searchAfter: lastHitSortValue } : {}),
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
        await this.#savedObjectsRepository.closePointInTime(this.#pitId);
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
      const { id } = await this.#savedObjectsRepository.openPointInTimeForType(
        this.#findOptions.type
      );
      this.#pitId = id;
      this.#open = true;
    } catch (e) {
      // Since `find` swallows 404s, it is expected that finder will do the same,
      // so we only rethrow non-404 errors here.
      if (e.output.statusCode !== 404) {
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
    searchAfter?: unknown[];
  }) {
    try {
      return await this.#savedObjectsRepository.find({
        // Sort fields are required to use searchAfter, so we set some defaults here
        sortField: 'updated_at',
        sortOrder: 'desc',
        // Bump keep_alive by 2m on every new request to allow for the ES client
        // to make multiple retries in the event of a network failure.
        ...(id ? { pit: { id, keepAlive: '2m' } } : {}),
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

  private getLastHitSortValue(res: SavedObjectsFindResponse): unknown[] | undefined {
    if (res.saved_objects.length < 1) {
      return undefined;
    }
    return res.saved_objects[res.saved_objects.length - 1].sort;
  }
}
