/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import {
  SavedObjectsClientContract,
  SavedObject,
  ISavedObjectsRepository,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  Pagination,
  FileShareJSON,
  FileShareJSONWithToken,
  FileShare,
  UpdatableFileShareMetadata,
} from '../../common/types';
import { FILE_SO_TYPE } from '../../common/constants';
import type { File } from '../../common/types';
import { fileShareObjectType } from '../saved_objects';
import { getCounters, Counters } from '../usage';
import { generateShareToken } from './generate_share_token';
import { FileShareServiceStart } from './types';
import {
  ExpiryDateInThePastError,
  FileShareNotFoundError,
  FileShareTokenInvalidError,
} from './errors';

/**
 * Arguments for a creating a file share
 */
export interface CreateShareArgs {
  /**
   * Optionally provide a name for this file share instance
   */
  name?: string;
  /**
   * Optionally set an expiration date as unix timestamp for this file share instance
   *
   * @note If not specified the file share will expire after 30 days
   */
  validUntil?: number;

  /**
   * The file object to create the share for
   */
  file: File;
}

/**
 * Arguments for listing file shares.
 */
export interface ListArgs extends Pagination {
  /**
   * The file ID for scope the list to.
   */
  fileId?: string;
}

/**
 * ID argument
 */
interface IdArg {
  /**
   * File share ID.
   */
  id: string;
}

/**
 * Delete file share arguments.
 */
export type DeleteArgs = IdArg;
/**
 * Get file share arguments.
 */
export type GetArgs = IdArg;

/**
 * Delete file shares for file arguments.
 */
export interface DeleteForFileArgs {
  /**
   * The file id to delete the shares for.
   */
  id: string;
}

/**
 * Update file share arguments.
 */
export interface UpdateArgs {
  /**
   * The file share ID.
   */
  id: string;
  /**
   * The updated attributes to store.
   */
  attributes: UpdatableFileShareMetadata;
}

function toFileShareJSON(so: SavedObject<FileShare>): FileShareJSON {
  return {
    id: so.id,
    fileId: so.references[0]?.id, // Assuming a single file reference
    created: so.attributes.created,
    validUntil: so.attributes.valid_until,
    name: so.attributes.name,
  };
}

function validateCreateArgs({ validUntil }: CreateShareArgs): void {
  if ((validUntil || validUntil === 0) && validUntil < Date.now()) {
    throw new ExpiryDateInThePastError('Share expiry date must be in the future.');
  }
}

/**
 * Service for managing file shares and associated Saved Objects.
 *
 * @internal
 */
export class InternalFileShareService implements FileShareServiceStart {
  private static usageCounter: undefined | UsageCounter;

  public static configureUsageCounter(uc: UsageCounter) {
    InternalFileShareService.usageCounter = uc;
  }

  private readonly savedObjectsType = fileShareObjectType.name;

  constructor(
    private readonly savedObjects: SavedObjectsClientContract | ISavedObjectsRepository
  ) {}

  private incrementUsageCounter(counter: Counters) {
    InternalFileShareService.usageCounter?.incrementCounter({
      counterName: getCounters('share_service')[counter],
    });
  }

  public async share(args: CreateShareArgs): Promise<FileShareJSONWithToken> {
    this.incrementUsageCounter('SHARE');
    try {
      validateCreateArgs(args);
      const { file, name, validUntil } = args;
      const so = await this.savedObjects.create<FileShare>(
        this.savedObjectsType,
        {
          created: new Date().toISOString(),
          name,
          valid_until: validUntil ? validUntil : Number(moment().add(30, 'days')),
          token: generateShareToken(),
        },
        {
          references: [{ name: file.data.name, id: file.data.id, type: FILE_SO_TYPE }],
        }
      );

      return { ...toFileShareJSON(so), token: so.attributes.token };
    } catch (e) {
      if (e instanceof ExpiryDateInThePastError) {
        this.incrementUsageCounter('SHARE_ERROR_EXPIRATION_IN_PAST');
      } else if (SavedObjectsErrorHelpers.isForbiddenError(e)) {
        this.incrementUsageCounter('SHARE_ERROR_FORBIDDEN');
      } else if (SavedObjectsErrorHelpers.isConflictError(e)) {
        this.incrementUsageCounter('SHARE_ERROR_CONFLICT');
      } else {
        this.incrementUsageCounter('SHARE_ERROR');
      }
      throw e;
    }
  }

  public async delete({ id }: DeleteArgs): Promise<void> {
    this.incrementUsageCounter('UNSHARE');
    try {
      await this.savedObjects.delete(this.savedObjectsType, id);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.incrementUsageCounter('UNSHARE_ERROR_NOT_FOUND');
      } else {
        this.incrementUsageCounter('UNSHARE_ERROR');
      }
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw new FileShareNotFoundError(`File share with id "${id}" not found.`);
      }
      throw e;
    }
  }

  private async internalList({
    fileId,
    perPage,
    page,
  }: ListArgs): Promise<Array<SavedObject<FileShare>>> {
    const result = await this.savedObjects.find<FileShare>({
      type: this.savedObjectsType,
      hasReference: fileId
        ? {
            type: FILE_SO_TYPE,
            id: fileId,
          }
        : undefined,
      perPage,
      page,
      sortField: 'created',
      sortOrder: 'desc',
    });
    return result.saved_objects;
  }

  public async deleteForFile({ id: fileId }: DeleteForFileArgs): Promise<void> {
    const savedObjects = await this.internalList({ fileId });
    await Promise.all(savedObjects.map(({ id }) => this.delete({ id })));
  }

  /**
   * Get a share token and also check whether it is valid.
   */
  public async getByToken(token: string): Promise<FileShareJSON> {
    const {
      saved_objects: [share],
    } = await this.savedObjects.find<FileShare>({
      type: this.savedObjectsType,
      filter: nodeBuilder.is(`${this.savedObjectsType}.attributes.token`, token),
    });

    if (!share) {
      throw new FileShareNotFoundError(`Could not find file share with token "${token}".`);
    }
    if (share.attributes.valid_until < Date.now() / 1000) {
      throw new FileShareTokenInvalidError(`Share "${token}" has expired.`);
    }
    return toFileShareJSON(share);
  }

  public async get({ id }: GetArgs): Promise<FileShareJSON> {
    try {
      return toFileShareJSON(await this.savedObjects.get(this.savedObjectsType, id));
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw new FileShareNotFoundError(e);
      }
      throw e;
    }
  }

  public async update({ id, attributes }: UpdateArgs): Promise<FileShare & { id: string }> {
    const result = await this.savedObjects.update<FileShare>(this.savedObjectsType, id, attributes);
    return { id, ...(result.attributes as FileShare) };
  }

  public async list(args: ListArgs): Promise<{ shares: FileShareJSON[] }> {
    const savedObjects = await this.internalList(args);
    return {
      shares: savedObjects.map(toFileShareJSON),
    };
  }
}
