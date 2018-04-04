import { Observable, ReplaySubject } from 'rxjs';

export class NativeController {

  killed = false;

  constructor(pluginId, process) {
    this.pluginId = pluginId;
    this.process = process;

    this._ready$ = new ReplaySubject(1);
    Observable
      .fromEvent(process, 'message')
      .filter(message => message === 'ready')
      .first()
      .subscribe(this._ready$);

    this._started$ = Observable
      .fromEvent(process, 'message')
      .filter(message => message === 'started')
      .first();
  }

  async start() {
    return this._ready$
      .mergeMap(() => {
        this.process.send('start');
        return this._started$;
      })
      .toPromise();
  }

  kill() {
    this.killed = true;
    this.process.kill('SIGKILL');
  }
}
