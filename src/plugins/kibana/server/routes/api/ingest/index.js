import { registerPost } from './register_post';
import { registerDelete } from './register_delete';
import { registerProcessors } from './register_processors';
import { registerSimulate } from './register_simulate';
import { registerData } from './register_data';
import registerFields from './register_fields';
import registerIndices from './register_indices';

export default function (server) {
  registerPost(server);
  registerDelete(server);
  registerProcessors(server);
  registerSimulate(server);
  registerData(server);
  registerFields(server);
  registerIndices(server);
}
