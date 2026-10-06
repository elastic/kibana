/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const sortOrderSchema: import('@kbn/config-schema').Type<'_doc' | 'asc' | 'desc'>;
export declare const sortSchema: import('@kbn/config-schema').Type<
  | string
  | (
      | string
      | Record<
          string,
          | '_doc'
          | 'asc'
          | 'desc'
          | Readonly<
              {
                missing?: string | number | boolean | undefined;
                mode?: 'avg' | 'max' | 'median' | 'min' | 'sum' | undefined;
                order?: '_doc' | 'asc' | 'desc' | undefined;
              } & {}
            >
        >
    )[]
  | Record<
      string,
      | '_doc'
      | 'asc'
      | 'desc'
      | Readonly<
          {
            missing?: string | number | boolean | undefined;
            mode?: 'avg' | 'max' | 'median' | 'min' | 'sum' | undefined;
            order?: '_doc' | 'asc' | 'desc' | undefined;
          } & {}
        >
    >
>;
