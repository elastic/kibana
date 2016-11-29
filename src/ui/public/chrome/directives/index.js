
import './global_nav';

import kbnChromeProv from './kbn_chrome';
import kbnChromeNavControlsProv from './append_nav_controls';
import './loading_indicator/loading_indicator';

export default function (chrome, internals) {
  kbnChromeProv(chrome, internals);
  kbnChromeNavControlsProv(chrome, internals);
}
