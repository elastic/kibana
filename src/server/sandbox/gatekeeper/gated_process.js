import { Observable } from 'rxjs';
import { safeChildProcess } from '../safe_child_process';
import { spawn } from 'child_process';

export class GatedProcess {
  constructor(processId, command, args) {
    this._processId = processId;
    this._process = spawn(command, args);
    safeChildProcess(this._process, Observable.of('SIGKILL'));

    this._process.stdout.on('data', data => this._send('stdout', data.toString()));
    this._process.stderr.on('data', data => this._send('stderr', data.toString()));
    this._process.addListener('error', data => this._send('error', data));
    this._process.addListener('exit', data => {
      if (!process.connected) {
        return;
      }

      this._send('exit', data);
    });
  }

  kill(signal) {
    this._process.kill(signal);
  }

  _send(type, payload) {
    process.send({ processId: this._processId, message: { type, payload } });
  }
}
