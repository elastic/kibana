import 'ui/autoload/all';
import chrome from 'ui/chrome';
import './angular/config';
import './angular/services';
import { CanvasRootController } from './angular/controllers';

import './style/index.css';

// Import the uiExports that the application uses
import 'uiExports/visTypes';
import 'uiExports/visResponseHandlers';
import 'uiExports/visRequestHandlers';
import 'uiExports/visEditorTypes';
import 'uiExports/savedObjectTypes';
import 'uiExports/spyModes';
import 'uiExports/fieldFormats';

// load the application
chrome.setRootController('canvas', CanvasRootController);
