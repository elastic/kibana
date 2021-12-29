/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic, ILocatorClient, LocatorData } from '../locators';

/**
 * A factory for Short URL Service. We need this factory as the dependency
 * injection is different between the server and the client. On the server,
 * the Short URL Service needs a saved object client scoped to the current
 * request and the current Kibana version. On the client, the Short URL Service
 * needs no dependencies.
 */
export interface IShortUrlClientFactory<D, Client extends IShortUrlClient = IShortUrlClient> {
  get(dependencies: D): Client;
}

export type IShortUrlClientFactoryProvider<
  D,
  ShortUrlClient extends IShortUrlClient = IShortUrlClient
> = (params: { locators: ILocatorClient }) => IShortUrlClientFactory<D, ShortUrlClient>;

/**
 * CRUD-like API for short URLs.
 */
export interface IShortUrlClient {
  /**
   * Create a new short URL.
   *
   * @param locator The locator for the URL.
   * @param param The parameters for the URL.
   * @returns The created short URL.
   */
  create<P extends SerializableRecord>(params: ShortUrlCreateParams<P>): Promise<ShortUrl<P>>;

  /**
   * Delete a short URL.
   *
   * @param slug The ID of the short URL.
   */
  delete(id: string): Promise<void>;

  /**
   * Fetch a short URL.
   *
   * @param id The ID of the short URL.
   */
  get(id: string): Promise<ShortUrl>;

  /**
   * Fetch a short URL by its slug.
   *
   * @param slug The slug of the short URL.
   */
  resolve(slug: string): Promise<ShortUrl>;
}

/**
 * New short URL creation parameters.
 */
export interface ShortUrlCreateParams<P extends SerializableRecord> {
  /**
   * Locator which will be used to resolve the short URL.
   */
  locator: LocatorPublic<P>;

  /**
   * Locator parameters which will be used to resolve the short URL.
   */
  params: P;

  /**
   * Optional, short URL slug - the part that will be used to resolve the short
   * URL. This part will be visible to the user, it can have user-friendly text.
   */
  slug?: string;

  /**
   * Whether to generate a slug automatically. If `true`, the slug will be
   * a human-readable text consisting of three worlds: "<adjective>-<adjective>-<noun>".
   */
  humanReadableSlug?: boolean;
}

/**
 * A representation of a short URL.
 */
export interface ShortUrl<LocatorParams extends SerializableRecord = SerializableRecord> {
  /**
   * Serializable state of the short URL, which is stored in Kibana.
   */
  readonly data: ShortUrlData<LocatorParams>;
}

/**
 * A representation of a short URL's data.
 */
export interface ShortUrlData<LocatorParams extends SerializableRecord = SerializableRecord> {
  /**
   * Unique ID of the short URL.
   */
  readonly id: string;

  /**
   * The slug of the short URL, the part after the `/` in the URL.
   */
  readonly slug: string;

  /**
   * Number of times the short URL has been resolved.
   */
  readonly accessCount: number;

  /**
   * The timestamp of the last time the short URL was resolved.
   */
  readonly accessDate: number;

  /**
   * The timestamp when the short URL was created.
   */
  readonly createDate: number;

  /**
   * The timestamp when the short URL was last modified.
   */
  readonly locator: LocatorData<LocatorParams>;
}

export type { LocatorData };
