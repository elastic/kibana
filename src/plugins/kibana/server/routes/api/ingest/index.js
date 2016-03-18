import { registerPost } from './register_post';
import { registerDelete } from './register_delete';
import { registerProcessors } from './register_processors';
import { registerSimulate } from './register_simulate';
import { registerBulk } from './register_bulk';

export default function (server) {
  registerPost(server);
  registerDelete(server);
  registerProcessors(server);
  registerSimulate(server);
  registerBulk(server);
}
