/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { defaults } from 'lodash';

import { Optional } from '@kbn/utility-types';

import { AggGroupNames, AggParam, AggGroupName } from '../../data/public';

export interface ISchemas {
  [AggGroupNames.Buckets]: Schema[];
  [AggGroupNames.Metrics]: Schema[];
  all: Schema[];
}

export interface Schema {
  aggFilter: string[];
  editor: boolean | string;
  group: AggGroupName;
  max: number;
  min: number;
  name: string;
  params: AggParam[];
  title: string;
  defaults: unknown;
  hideCustomLabel?: boolean;
  mustBeFirst?: boolean;
  aggSettings?: any;
}

export class Schemas implements ISchemas {
  all: Schema[] = [];
  [AggGroupNames.Buckets]: Schema[] = [];
  [AggGroupNames.Metrics]: Schema[] = [];

  constructor(
    schemas: Array<
      Optional<
        Schema,
        'min' | 'max' | 'group' | 'title' | 'aggFilter' | 'editor' | 'params' | 'defaults'
      >
    >
  ) {
    _(schemas || [])
      .chain()
      .map((schema) => {
        if (!schema.name) throw new Error('all schema must have a unique name');

        if (schema.name === 'split') {
          schema.params = [
            {
              name: 'row',
              default: true,
            },
          ] as AggParam[];
        }

        defaults(schema, {
          min: 0,
          max: Infinity,
          group: AggGroupNames.Buckets,
          title: schema.name,
          aggFilter: '*',
          editor: false,
          params: [],
        });

        return schema as Schema;
      })
      .tap((fullSchemas: Schema[]) => {
        this.all = fullSchemas;
      })
      .groupBy('group')
      .forOwn((group, groupName) => {
        // @ts-ignore
        this[groupName] = group;
      })
      .commit();
  }
}

export const getSchemaByName = (schemas: Schema[], schemaName?: string) => {
  return schemas.find((s) => s.name === schemaName) || ({} as Schema);
};
