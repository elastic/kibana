import { get } from 'lodash';
import uiRoutes, { WAIT_FOR_URL_CHANGE_TOKEN } from 'ui/routes';
import uiChrome from 'ui/chrome';
import { Notifier } from 'ui/notify/notifier';
import { IndexPatternsGetIdsProvider } from 'ui/index_patterns/_get_ids';
import { hasOptedOutOfGettingStarted, optOutOfGettingStarted } from 'ui/getting_started/opt_out_helpers';

import {
  GETTING_STARTED_ROUTE,
  CREATE_INDEX_PATTERN_ROUTE
} from './constants';

uiRoutes
  .addSetupWork(function gettingStartedGateCheck(Private, $injector) {
    const getIds = Private(IndexPatternsGetIdsProvider);
    const config = $injector.get('config');
    const kbnUrl = $injector.get('kbnUrl');
    const $route = $injector.get('$route');

    const currentRoute = get($route, 'current.$$route');

    return getIds()
    .then(indexPatterns => {
      const indexPatternsExist = Array.isArray(indexPatterns) && indexPatterns.length > 0;
      const isOnGettingStartedPage = get(currentRoute, 'originalPath') === GETTING_STARTED_ROUTE;

      if (indexPatternsExist) {

        // The user need not see the Getting Started page, so opt them out of it
        optOutOfGettingStarted();

        // Some routes require a default index pattern to be present. If we're
        // NOT on such a route, there's nothing more to do; send the user on their way
        if (!currentRoute.requireDefaultIndex) {
          return;
        }

        // Otherwise, check if we have a default index pattern
        let defaultIndexPattern = config.get('defaultIndex');

        // If we don't have an default index pattern, make the first index pattern the
        // default one
        if (!Boolean(defaultIndexPattern)) {
          defaultIndexPattern = indexPatterns[0];
          config.set('defaultIndex', defaultIndexPattern);
        }

        // At this point, we have a default index pattern and are all set!
        return;
      }

      // At this point, no index patterns exist.

      // If the user has explicitly opted out of the Getting Started page
      if (hasOptedOutOfGettingStarted()) {

        // Some routes require a default index pattern to be present. If we're
        // NOT on such a route, there's nothing more to do; send the user on their way
        if (!currentRoute.requireDefaultIndex) {
          return;
        }

        // Otherwise, redirect the user to the index pattern creation page with
        // a notification about creating an index pattern
        const notify = new Notifier({
          location: 'Index Patterns'
        });
        notify.error('Please create a new index pattern');
        kbnUrl.change(CREATE_INDEX_PATTERN_ROUTE);
        throw WAIT_FOR_URL_CHANGE_TOKEN;
      }

      // Redirect the user to the Getting Started page (unless they are on it already)
      if (!isOnGettingStartedPage) {
        uiChrome.setVisible(false);
        kbnUrl.change(GETTING_STARTED_ROUTE);
        throw WAIT_FOR_URL_CHANGE_TOKEN;
      }
    });
  });
