import { get } from 'lodash';

import uiRoutes from '../routes';
import { KbnUrlProvider } from '../url';

import './error_allow_explicit_index.less';
import template from './error_allow_explicit_index.html';

uiRoutes
  .when('/error/multi.allow_explicit_index', { template });

export function ErrorAllowExplicitIndexProvider(Private, Promise) {
  const kbnUrl = Private(KbnUrlProvider);

  return new (class ErrorAllowExplicitIndex {
    test(error) {
      if (!error || error.status !== 400) {
        return false;
      }

      const type = get(error, 'body.error.type');
      const reason = get(error, 'body.error.reason');

      return (
        type === 'illegal_argument_exception' &&
        String(reason).includes('explicit index')
      );
    }

    takeover() {
      kbnUrl.change('/error/multi.allow_explicit_index');
      return Promise.halt();
    }
  });
}
