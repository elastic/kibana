import { DataView } from './data/data_view';
import { RequestsView } from './requests/requests_view';

import { viewRegistry } from 'ui/inspector';

viewRegistry.register(DataView);
viewRegistry.register(RequestsView);
