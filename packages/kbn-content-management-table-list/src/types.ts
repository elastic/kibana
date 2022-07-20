/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import { set } from '@elastic/safer-lodash-set';
// import { get, has } from 'lodash';

export interface SimpleSavedObject<T = unknown> {
  attributes: T;
  _version?: SavedObject<T>['version'];
  id: SavedObject<T>['id'];
  type: SavedObject<T>['type'];
  migrationVersion: SavedObject<T>['migrationVersion'];
  coreMigrationVersion: SavedObject<T>['coreMigrationVersion'];
  error: SavedObject<T>['error'];
  references: SavedObject<T>['references'];
  updatedAt?: SavedObject<T>['updated_at'];
  namespaces: SavedObject<T>['namespaces'];

  // get: (key: string) => any;
  // set(key: string, value: any): T;
  // has: (key: string) => boolean;
  // save: () => Promise<SimpleSavedObject<T>>;
  // delete: () => any;
}

export type SimpleSavedObjectConstructor<T> = new (
  client: any,
  savedObject: SavedObject<T>
) => SimpleSavedObject;

// export class SimpleSavedObject<T = unknown> {
//   public attributes: T;
//   // We want to use the same interface this class had in JS
//   public _version?: SavedObject<T>['version'];
//   public id: SavedObject<T>['id'];
//   public type: SavedObject<T>['type'];
//   public migrationVersion: SavedObject<T>['migrationVersion'];
//   public coreMigrationVersion: SavedObject<T>['coreMigrationVersion'];
//   public error: SavedObject<T>['error'];
//   public references: SavedObject<T>['references'];
//   public updatedAt?: SavedObject<T>['updated_at'];
//   /**
//    * Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
//    * `namespaceType: 'agnostic'`.
//    */
//   public namespaces: SavedObject<T>['namespaces'];

//   constructor(
//     private client: any,
//     {
//       id,
//       type,
//       version,
//       attributes,
//       error,
//       references,
//       migrationVersion,
//       coreMigrationVersion,
//       namespaces,
//       updated_at: updatedAt,
//     }: SavedObject<T>
//   ) {
//     this.id = id;
//     this.type = type;
//     this.attributes = attributes || ({} as T);
//     this.references = references || [];
//     this._version = version;
//     this.migrationVersion = migrationVersion;
//     this.coreMigrationVersion = coreMigrationVersion;
//     this.namespaces = namespaces;
//     this.updatedAt = updatedAt;
//     if (error) {
//       this.error = error;
//     }
//   }

//   public get(key: string): any {
//     return get(this.attributes, key);
//   }

//   public set(key: string, value: any): T {
//     return set(this.attributes as any, key, value);
//   }

//   public has(key: string): boolean {
//     return has(this.attributes, key);
//   }

//   public save(): Promise<SimpleSavedObject<T>> {
//     if (this.id) {
//       return this.client
//         .update(this.type, this.id, this.attributes, {
//           references: this.references,
//         })
//         .then((sso: any) => {
//           this.updatedAt = sso.updatedAt;
//           return sso;
//         });
//     } else {
//       return this.client
//         .create(this.type, this.attributes, {
//           migrationVersion: this.migrationVersion,
//           coreMigrationVersion: this.coreMigrationVersion,
//           references: this.references,
//         })
//         .then((sso: any) => {
//           this.updatedAt = sso.updatedAt;
//           return sso;
//         });
//     }
//   }

//   public delete() {
//     return this.client.delete(this.type, this.id);
//   }
// }

export interface SavedObject<T = unknown> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** Timestamp of the last time this document had been updated.  */
  updated_at?: string;
  error?: any; // SavedObjectError
  /** {@inheritdoc SavedObjectAttributes} */
  attributes: T;
  /** {@inheritdoc SavedObjectReference} */
  references: any; // SavedObjectReference[]
  /** {@inheritdoc SavedObjectsMigrationVersion} */
  migrationVersion?: any; // SavedObjectsMigrationVersion
  /** A semver value that is used when upgrading objects between Kibana versions. */
  coreMigrationVersion?: string;
  /**
   * Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
   * `namespaceType: 'agnostic'`.
   */
  namespaces?: string[];
  /**
   * The ID of the saved object this originated from. This is set if this object's `id` was regenerated; that can happen during migration
   * from a legacy single-namespace type, or during import. It is only set during migration or create operations. This is used during import
   * to ensure that ID regeneration is deterministic, so saved objects will be overwritten if they are imported multiple times into a given
   * space.
   */
  originId?: string;
}

export type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => () => void;
