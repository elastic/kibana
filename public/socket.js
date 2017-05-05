import { map } from 'lodash';
import io from 'socket.io-client';
import chrome from 'ui/chrome';
import { functions } from './lib/functions';

const basePath = chrome.getBasePath();
export const socket = io(undefined, { path: `${basePath}/socket.io` });

socket.on('getFunctionList', () => {
  socket.emit('functionList', map(functions.toJS(), 'name'));
});
