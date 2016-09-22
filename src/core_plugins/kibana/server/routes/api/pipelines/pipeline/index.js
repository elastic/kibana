import registerDelete from './register_delete';
import registerGet from './register_get';
import registerPut from './register_put';

export default function (server) {
  registerDelete(server);
  registerGet(server);
  registerPut(server);
}
