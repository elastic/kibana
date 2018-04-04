import { registerStatus } from './register_status';

export function statusApi(server, kbnServer) {
  registerStatus(server, kbnServer);
}
