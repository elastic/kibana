/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectType } from 'tsd';

import { schema } from '../../..';
import type { SchemaOf } from './schema_of';

describe('SchemaOf', () => {
  it('should create basic schema type from output', () => {
    interface MySchemaOutput {
      name: string;
      age?: number | undefined;
    }

    type Expected = SchemaOf<MySchemaOutput>;

    expectType<Expected>(
      schema.object({
        name: schema.string(),
        age: schema.maybe(schema.number()),
      })
    );
  });

  it('should error on missing property definitions', () => {
    interface MySchemaOutput {
      name: string;
      age: number;
      maybe?: number;
    }

    type Expected = SchemaOf<MySchemaOutput>;

    expectType<Expected>(
      // @ts-expect-error
      schema.object({
        name: schema.string(),
        age: schema.string(),
        maybe: schema.maybe(schema.number()),
      })
    );

    // unable to enforce presence of optional types
    expectType<Expected>(
      schema.object({
        name: schema.string(),
        age: schema.number(),
        // maybe: schema.maybe(schema.number()),
      })
    );
  });

  it('should create basic schema type that allows defaults', () => {
    interface MySchemaOutput {
      name: string;
      age: number;
    }

    type Expected = SchemaOf<MySchemaOutput>;

    expectType<Expected>(
      schema.object({
        name: schema.string().default('John'),
        age: schema.number().default(1),
      })
    );
  });

  it('should create schema with array of objects', () => {
    interface ArrayItem {
      name: string;
      age: number | string;
    }
    interface MySchemaOutput {
      arr: ArrayItem[];
    }

    type Expected = SchemaOf<MySchemaOutput>;

    expectType<Expected>(
      schema.object({
        arr: schema.arrayOf(
          schema.object({
            name: schema.string(),
            age: schema.string(),
          })
        ),
      })
    );
  });

  it('should create nested schema type', () => {
    interface MySchemaOutput {
      name: string;
      age: number;
      obj: {
        bool: boolean;
      };
    }

    type Expected = SchemaOf<MySchemaOutput>;

    expectType<Expected>(
      schema.object({
        name: schema.string(),
        age: schema.number(),
        obj: schema.object({
          bool: schema.boolean(),
        }),
      })
    );
  });
});
