import io from 'socket.io-client';
import chrome from 'ui/chrome';
import { functionsRegistry } from '../common/lib/functions_registry';

const basePath = chrome.getBasePath();
export const socket = io(undefined, { path: `${basePath}/socket.io` });

socket.on('getFunctionList', () => {
  socket.emit('functionList', functionsRegistry.toJS());
});
