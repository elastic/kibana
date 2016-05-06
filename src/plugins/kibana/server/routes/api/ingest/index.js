import { registerPost } from './register_post';
import { registerDelete } from './register_delete';
import { registerProcessors } from './register_processors';
import { registerSimulate } from './register_simulate';

export default function (server) {
  registerPost(server);
  registerDelete(server);
  registerProcessors(server);
  registerSimulate(server);
}
