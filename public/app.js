import 'ui/autoload/all';
import chrome from 'ui/chrome';
import './angular/config';
import './angular/services';
import { CanvasRootController } from './angular/controllers';

import './style/index.css';

// load the application
chrome.setRootController('canvas', CanvasRootController);
