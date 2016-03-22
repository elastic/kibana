import 'ui/directives/config';

import './app_switcher';
import kbnChromeProv from './kbn_chrome';
import kbnChromeNavControlsProv from './append_nav_controls';
import courierLoadingIndicator from './kbn_loading_indicator';

export default function (chrome, internals) {
  kbnChromeProv(chrome, internals);
  kbnChromeNavControlsProv(chrome, internals);
}
