import { Observable, ReplaySubject } from 'rxjs';

export class NativeController {

  killed = false;
  _started = false;

  constructor(pluginId, process) {
    this.pluginId = pluginId;
    this.process = process;

    this._ready$ = new ReplaySubject(1);
    Observable
      .fromEvent(process, 'message')
      .filter(message => message === 'ready')
      .first()
      .subscribe(this._ready$);
  }

  async start() {
    if (this._started) {
      throw new Error(`Already started, can't start again`);
    }
    this._started = true;

    return this._ready$
      .mergeMap(() => {
        if (this.process.killed) {
          throw new Error(`Can't start killed process`);
        }

        this.process.send('start');
        return Observable
          .fromEvent(this.process, 'message')
          .filter(message => message === 'started')
          .first();
      })
      .toPromise();
  }

  kill() {
    if (this.killed) {
      throw new Error(`Already killed, can't kill again`);
    }
    this.killed = true;

    this.process.kill('SIGKILL');
  }
}
