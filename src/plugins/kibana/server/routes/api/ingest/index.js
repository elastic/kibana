import { registerPost } from './register_post';
import { registerDelete } from './register_delete';
import { registerSimulate } from './register_simulate';

export default function (server) {
  registerPost(server);
  registerDelete(server);
  registerSimulate(server);
}
