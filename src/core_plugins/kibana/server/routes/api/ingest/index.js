import { registerProcessors } from './register_processors';
import { registerSimulate } from './register_simulate';
import { registerFieldCapabilities } from './register_field_capabilities';

export default function (server) {
  registerProcessors(server);
  registerSimulate(server);
  registerFieldCapabilities(server);
}
