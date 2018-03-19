import readline from 'readline';
import { get } from 'lodash';

export async function sandboxProcessesPrompt(settings) {
  if (settings.plugins.some(plugin => get(plugin, 'kibana.sandbox.processes'))) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });


    const question = `
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@        WARNING: plugin permits native processes         @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
This plugin permits native processes to be spawned that are
not subject to the system call filters.

Continue with installation? [y/N]`;

    const answer = await new Promise(resolve => {
      rl.question(question, resolve);
    });

    rl.close();

    return answer.toLowerCase() === 'y';
  }
}
