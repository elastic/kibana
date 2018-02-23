import 'ui/autoload/all';
import chrome from 'ui/chrome';
import './angular/config';
import './angular/services';
import { CanvasRootController } from './angular/controllers';
import { initialize as initializeFullscreen } from './lib/fullscreen';

// TODO: We needed button style support. Remove this and hackery.less when you can
import 'bootstrap/dist/css/bootstrap.css';
import './style/main.less';

// enable fullscreen controls
initializeFullscreen(document);

// load the application
chrome.setRootController('canvas', CanvasRootController);
