import { Observable } from 'rxjs';

export class NativeController {

  killed = false;

  constructor(pluginId, process) {
    this.pluginId = pluginId;
    this.process = process;

    this.ready$ = Observable
      .fromEvent(process, 'message')
      .filter(message => message === 'ready')
      .first();

    this.started$ = Observable
      .fromEvent(process, 'message')
      .filter(message => message === 'started')
      .first();
  }

  start() {
    this.process.send('start');
  }

  kill() {
    this.killed = true;
    this.process.kill('SIGKILL');
  }
}
