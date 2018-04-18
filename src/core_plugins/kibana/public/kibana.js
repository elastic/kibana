// autoloading

// preloading (for faster webpack builds)
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { uiModules } from 'ui/modules';

import 'ui/autoload/all';
import './home';
import './discover';
import './visualize';
import './dashboard';
import './management';
import './doc';
import './dev_tools';
import './context';
import 'ui/vislib';
import 'ui/agg_response';
import 'ui/agg_types';
import 'ui/timepicker';
import { Notifier } from 'ui/notify';
import 'leaflet';
import { KibanaRootController } from './kibana_root_controller';

routes.enable();

routes
  .otherwise({
    redirectTo: `/${chrome.getInjected('kbnDefaultAppId', 'discover')}`
  });

chrome.setRootController('kibana', KibanaRootController);

uiModules.get('kibana').run(Notifier.pullMessageFromUrl);
