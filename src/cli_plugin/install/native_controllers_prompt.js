import readline from 'readline';
import { get } from 'lodash';

export async function nativeControllersPrompt(settings) {
  if (settings.plugins.some(plugin => get(plugin, 'kibana.nativeControllers'))) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });


    const question = `
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: plugin forks a native controller          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
This plugin launches a native controller that is not subject
to the system call filters and is explicitly allowed to spawn
new processes.

Continue with installation? [y/N]`;

    const answer = await new Promise(resolve => {
      rl.question(question, resolve);

      if (settings.batch) {
        rl.write('y');
        rl.write(null, { name: 'enter' });
      }
    });

    rl.close();

    return answer.toLowerCase() === 'y';
  }
}
