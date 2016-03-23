import RegisterPost from './register_post';
import RegisterDelete from './register_delete';
import RegisterSimulate from './register_simulate';

export default function (server) {
  RegisterPost(server);
  RegisterDelete(server);
  RegisterSimulate(server);
}
