/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const schemas: {
  get: {
    in: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      id: import('@kbn/config-schema').Type<string>;
      version: import('@kbn/config-schema').Type<number>;
      options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
    out: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      result: import('@kbn/config-schema').ObjectType<{
        item: import('@kbn/config-schema').ObjectType<{}>;
        meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
      }>;
    }>;
  };
  bulkGet: {
    in: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      version: import('@kbn/config-schema').Type<number>;
      ids: import('@kbn/config-schema').Type<string[]>;
      options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
    out: import('@kbn/config-schema').ObjectType<{
      hits: import('@kbn/config-schema').Type<
        Readonly<
          {} & {
            contentTypeId: string;
            result: Readonly<
              {
                meta?: Readonly<{} & {}> | undefined;
              } & {
                item: Readonly<{} & {}>;
              }
            >;
          }
        >[]
      >;
      meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
  };
  create: {
    in: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      version: import('@kbn/config-schema').Type<number>;
      data: import('@kbn/config-schema').Type<Record<string, any>>;
      options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
    out: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      result: import('@kbn/config-schema').ObjectType<{
        item: import('@kbn/config-schema').ObjectType<{}>;
        meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
      }>;
    }>;
  };
  update: {
    in: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      id: import('@kbn/config-schema').Type<string>;
      version: import('@kbn/config-schema').Type<number>;
      data: import('@kbn/config-schema').Type<Record<string, any>>;
      options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
    out: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      result: import('@kbn/config-schema').ObjectType<{
        item: import('@kbn/config-schema').ObjectType<{}>;
        meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
      }>;
    }>;
  };
  delete: {
    in: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      id: import('@kbn/config-schema').Type<string>;
      version: import('@kbn/config-schema').Type<number>;
      options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
    out: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      result: import('@kbn/config-schema').ObjectType<{
        success: import('@kbn/config-schema').Type<boolean>;
      }>;
    }>;
  };
  search: {
    in: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      version: import('@kbn/config-schema').Type<number>;
      query: import('@kbn/config-schema').Type<
        Readonly<
          {
            text?: string | undefined;
            tags?:
              | Readonly<
                  {
                    included?: string[] | undefined;
                    excluded?: string[] | undefined;
                  } & {}
                >
              | undefined;
            limit?: number | undefined;
            cursor?: string | undefined;
          } & {}
        >
      >;
      options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
    out: import('@kbn/config-schema').ObjectType<{
      contentTypeId: import('@kbn/config-schema').Type<string>;
      result: import('@kbn/config-schema').ObjectType<{
        hits: import('@kbn/config-schema').Type<any[]>;
        pagination: import('@kbn/config-schema').ObjectType<{
          total: import('@kbn/config-schema').Type<number>;
          cursor: import('@kbn/config-schema').Type<string | undefined>;
        }>;
      }>;
      meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
  };
  mSearch: {
    in: import('@kbn/config-schema').ObjectType<{
      contentTypes: import('@kbn/config-schema').Type<
        Readonly<
          {} & {
            contentTypeId: string;
            version: number;
          }
        >[]
      >;
      query: import('@kbn/config-schema').Type<
        Readonly<
          {
            text?: string | undefined;
            tags?:
              | Readonly<
                  {
                    included?: string[] | undefined;
                    excluded?: string[] | undefined;
                  } & {}
                >
              | undefined;
            limit?: number | undefined;
            cursor?: string | undefined;
          } & {}
        >
      >;
    }>;
    out: import('@kbn/config-schema').ObjectType<{
      contentTypes: import('@kbn/config-schema').Type<
        Readonly<
          {} & {
            contentTypeId: string;
            version: number;
          }
        >[]
      >;
      result: import('@kbn/config-schema').ObjectType<{
        hits: import('@kbn/config-schema').Type<any[]>;
        pagination: import('@kbn/config-schema').ObjectType<{
          total: import('@kbn/config-schema').Type<number>;
          cursor: import('@kbn/config-schema').Type<string | undefined>;
        }>;
      }>;
    }>;
  };
};
