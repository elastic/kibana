/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { get, has } from 'lodash';
import type { SavedObject as SavedObjectType } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsClientContract,
  SimpleSavedObject,
} from '@kbn/core-saved-objects-api-browser';

/**
 * Core internal implementation of {@link SimpleSavedObject}
 *
 * @internal Should use the {@link SimpleSavedObject} interface instead
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export class SimpleSavedObjectImpl<T = unknown> implements SimpleSavedObject<T> {
  public attributes: T;
  public _version?: SavedObjectType<T>['version'];
  public id: SavedObjectType<T>['id'];
  public type: SavedObjectType<T>['type'];
  /** @deprecated */
  public migrationVersion: SavedObjectType<T>['migrationVersion'];
  public coreMigrationVersion: SavedObjectType<T>['coreMigrationVersion'];
  public typeMigrationVersion: SavedObjectType<T>['typeMigrationVersion'];
  public managed: SavedObjectType<T>['managed'];
  public error: SavedObjectType<T>['error'];
  public references: SavedObjectType<T>['references'];
  public updatedAt: SavedObjectType<T>['updated_at'];
  public updatedBy: SavedObjectType<T>['updated_by'];
  public createdAt: SavedObjectType<T>['created_at'];
  public createdBy: SavedObjectType<T>['created_by'];
  public namespaces: SavedObjectType<T>['namespaces'];

  constructor(
    private client: SavedObjectsClientContract,
    {
      id,
      type,
      version,
      attributes,
      error,
      references,
      migrationVersion,
      coreMigrationVersion,
      typeMigrationVersion,
      managed,
      namespaces,
      updated_at: updatedAt,
      updated_by: updatedBy,
      created_at: createdAt,
      created_by: createdBy,
    }: SavedObjectType<T>
  ) {
    this.id = id;
    this.type = type;
    this.attributes = attributes || ({} as T);
    this.references = references || [];
    this._version = version;
    this.migrationVersion = migrationVersion;
    this.coreMigrationVersion = coreMigrationVersion;
    this.typeMigrationVersion = typeMigrationVersion;
    this.managed = managed;
    this.namespaces = namespaces;
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    if (error) {
      this.error = error;
    }
  }

  public get(key: string): any {
    return get(this.attributes, key);
  }

  public set(key: string, value: any): T {
    return set(this.attributes as any, key, value);
  }

  public has(key: string): boolean {
    return has(this.attributes, key);
  }

  public save(): Promise<SimpleSavedObject<T>> {
    if (this.id) {
      return this.client
        .update(this.type, this.id, this.attributes, {
          references: this.references,
        })
        .then((sso) => {
          this.updatedAt = sso.updatedAt;
          return sso;
        });
    } else {
      return this.client
        .create(this.type, this.attributes, {
          migrationVersion: this.migrationVersion,
          coreMigrationVersion: this.coreMigrationVersion,
          typeMigrationVersion: this.typeMigrationVersion,
          managed: this.managed,
          references: this.references,
        })
        .then((sso) => {
          this.updatedAt = sso.updatedAt;
          return sso;
        });
    }
  }

  public delete() {
    return this.client.delete(this.type, this.id);
  }
}
