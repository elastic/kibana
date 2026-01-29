/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isString } from 'lodash';
import { LICENSE_TYPE_GOLD, REPORTING_EXPORT_TYPES } from '@kbn/reporting-common';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { ExportType } from '.';

type GetCallbackFn = (item: ExportType) => boolean;

export class ExportTypesRegistry {
  private licensing: LicensingPluginSetup;
  private _map: Map<string, ExportType> = new Map();

  constructor(licensing: LicensingPluginSetup) {
    this.licensing = licensing;
  }

  register(item: ExportType): void {
    if (!isString(item.id)) {
      throw new Error(`'item' must have a String 'id' property `);
    }

    if (this._map.has(item.id)) {
      throw new Error(`'item' with id ${item.id} has already been registered`);
    }

    // register feature usage
    this.registerFeatureUsageName(item);

    this._map.set(item.id, item);
  }

  getAll() {
    return Array.from(this._map.values());
  }

  getSize() {
    return this._map.size;
  }

  getById(id: string): ExportType {
    if (!this._map.has(id)) {
      throw new Error(`Unknown id ${id}`);
    }

    return this._map.get(id) as ExportType;
  }

  getByJobType(jobType: ExportType['jobType']): ExportType {
    let result;
    for (const value of this._map.values()) {
      if (value.jobType !== jobType) {
        continue;
      }
      const foundJobType = value;

      if (result) {
        throw new Error('Found multiple items matching predicate.');
      }

      result = foundJobType;
    }

    if (!result) {
      throw new Error('Found no items matching predicate');
    }

    return result;
  }

  get(findType: GetCallbackFn): ExportType {
    let result;
    for (const value of this._map.values()) {
      if (!findType(value)) {
        continue; // try next value
      }
      const foundResult: ExportType = value;

      if (result) {
        throw new Error('Found multiple items matching predicate.');
      }

      result = foundResult;
    }

    if (!result) {
      throw new Error('Found no items matching predicate');
    }

    return result;
  }

  private registerFeatureUsageName(item: ExportType) {
    REPORTING_EXPORT_TYPES.forEach((exportType) => {
      if (item.shouldNotifyUsage(exportType)) {
        this.licensing.featureUsage.register(
          item.getFeatureUsageName(exportType),
          LICENSE_TYPE_GOLD
        );
      }
    });
  }
}
