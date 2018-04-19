import { get } from 'lodash';

import uiRoutes from '../routes';
import { KbnUrlProvider } from '../url';

import './error_auto_create_index.less';
import template from './error_auto_create_index.html';

uiRoutes
  .when('/error/action.auto_create_index', { template });

export function ErrorAutoCreateIndexProvider(Private, Promise) {
  const kbnUrl = Private(KbnUrlProvider);

  return new (class ErrorAutoCreateIndex {
    test(error) {
      return (
        error.statusCode === 503 &&
        get(error, 'body.code') === 'ES_AUTO_CREATE_INDEX_ERROR'
      );
    }

    takeover() {
      kbnUrl.change('/error/action.auto_create_index');
      return Promise.halt();
    }
  });
}
