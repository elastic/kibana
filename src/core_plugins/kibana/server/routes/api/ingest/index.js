import { registerPost } from './register_post';
import { registerDelete } from './register_delete';
import { registerProcessors } from './register_processors';
import { registerSimulate } from './register_simulate';
import { registerData } from './register_data';
import { registerFieldCapabilities } from './register_field_capabilities';

export default function (server) {
  registerPost(server);
  registerDelete(server);
  registerProcessors(server);
  registerSimulate(server);
  registerData(server);
  registerFieldCapabilities(server);
}
