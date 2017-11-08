import 'brace';
import 'brace/mode/json';
import '@elastic/ui-ace/ui-ace';

import { uiModules } from 'ui/modules';

uiModules.get('kibana', ['ui.ace']);
