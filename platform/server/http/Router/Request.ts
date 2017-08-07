import * as express from 'express';

import { Route } from '.';
import { ObjectSetting, Props } from '../../../lib/schema';
import { Headers, filterHeaders } from './headers';

// TODO Explore validating headers too (can't validate _all_, but you only
// receive the headers you _have_ validated).
export class KibanaRequest<
  Params extends Props = {},
  Query extends Props = {},
  Body extends Props = {}
> {
  readonly headers: Headers;
  readonly url: string;

  static validate<
    Params extends Props = {},
    Query extends Props = {},
    Body extends Props = {}
  >(
    route: Route<
      ObjectSetting<Params>,
      ObjectSetting<Query>,
      ObjectSetting<Body>
    >,
    req: express.Request
  ): { params: Params; query: Query; body: Body } {
    let params: Params;
    let query: Query;
    let body: Body;

    if (route.validate === undefined) {
      params = req.params;
      query = req.query;
      body = req.body;
    } else {
      if (route.validate.params === undefined) {
        params = req.params;
      } else {
        params = route.validate.params.validate(req.params);
      }

      if (route.validate.query === undefined) {
        query = req.query;
      } else {
        query = route.validate.query.validate(req.query);
      }

      if (route.validate.body === undefined) {
        body = req.body;
      } else {
        body = route.validate.body.validate(req.body);
      }
    }

    return { query, params, body };
  }

  constructor(
    req: express.Request,
    readonly params: Params,
    readonly query: Query,
    readonly body: Body
  ) {
    this.headers = req.headers;
    this.url = req.url;
  }

  getFilteredHeaders(headersToKeep: string[]) {
    return filterHeaders(this.headers, headersToKeep);
  }
}
