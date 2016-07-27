import './app_switcher';
import './app_switcher_link';
import kbnChromeProv from './kbn_chrome';
import kbnChromeNavControlsProv from './append_nav_controls';
import './kbn_loading_indicator';

export default function (chrome, internals) {
  kbnChromeProv(chrome, internals);
  kbnChromeNavControlsProv(chrome, internals);
}
