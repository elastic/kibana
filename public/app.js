import 'ui/autoload/all';
import uiRoutes from 'ui/routes';
import './state/store_service';
import './directives';
import './apps';
import { initialize as initializeFullscreen } from './lib/fullscreen';

// TODO: We needed button style support. Remove this and hackery.less when you can
import 'bootstrap/dist/css/bootstrap.css';
import './style/main.less';

// enable fullscreen controls
initializeFullscreen(document);

// enable the angular router
uiRoutes.enable();
