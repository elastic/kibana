import 'ngreact';
import './no_results.less';
import { uiModules } from 'ui/modules';

import {
  DiscoverNoResults,
} from './no_results';

import './timechart';

const app = uiModules.get('apps/discover', ['react']);

app.directive('discoverNoResults', reactDirective => reactDirective(DiscoverNoResults));
