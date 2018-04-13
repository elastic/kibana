import { registerLanguages } from './register_languages';

export function scriptsApi(server) {
  registerLanguages(server);
}
