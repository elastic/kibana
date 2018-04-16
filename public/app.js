import 'ui/autoload/all';
import chrome from 'ui/chrome';
import './angular/config';
import './angular/services';
import { CanvasRootController } from './angular/controllers';

// TODO: We needed button style support. Remove this and hackery.less when you can
import 'bootstrap/dist/css/bootstrap.css';
import './style/main.less';

// load the application
chrome.setRootController('canvas', CanvasRootController);
