import * as home from './home';
import * as workpad from './workpad';

export const routes = [].concat(workpad.routes, home.routes);

export const apps = [workpad.WorkpadApp, home.HomeApp];
