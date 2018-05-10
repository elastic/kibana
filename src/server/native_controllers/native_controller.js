import { Observable, ReplaySubject } from 'rxjs';

class NativeController {

  killed = false;
  _configured = false;
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

  async configure(config) {
    if (this._configured) {
      throw new Error(`Already configured, can't configure again`);
    }
    this._configured = true;

    const configured$ = this._ready$
      .mergeMap(() => {
        this.process.send({ type: 'configure', payload: config });
        return Observable
          .fromEvent(this.process, 'message')
          .filter(message => message === 'configured')
          .first();
      });

    await configured$.toPromise();
  }

  async start() {
    if (this._started) {
      throw new Error(`Already started, can't start again`);
    }
    this._started = true;

    if (this.process.killed) {
      throw new Error(`Can't start killed process`);
    }

    this.process.send({ type: 'start' });
    return Observable
      .fromEvent(this.process, 'message')
      .filter(message => message === 'started')
      .first()
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

export function createNativeController(pluginId, process) {
  return new NativeController(pluginId, process);
}
