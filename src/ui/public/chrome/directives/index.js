
import './global_nav';

import { kbnChromeProvider } from './kbn_chrome';
import { kbnAppendChromeNavControls } from './append_nav_controls';
import './loading_indicator/loading_indicator';

export function directivesProvider(chrome, internals) {
  kbnChromeProvider(chrome, internals);
  kbnAppendChromeNavControls(chrome, internals);
}
