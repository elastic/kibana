import { registerPost } from './register_post';
import { registerDelete } from './register_delete';
import { registerData } from './register_data';
import { registerFieldCapabilities } from './register_field_capabilities';

export default function (server) {
  registerPost(server);
  registerDelete(server);
  registerData(server);
  registerFieldCapabilities(server);
}
