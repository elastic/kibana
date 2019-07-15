import { EventEmitter } from 'events';

const eventNames = {
  licenseCheck: 'LICENSE_CHECK',
  passwordCheck: 'PASSWORD_CHECK',
  timeSyncCheck: 'TIME_SYNC_CHECK',
  startTimePolling: 'TIME_POLL_START',
  stopTimePolling: 'TIME_POLL_STOP',
};

export type EventName = (typeof eventNames)[keyof typeof eventNames];

class Events {
  public events: EventEmitter;
  public eventNames = eventNames;
  constructor() {
    this.events = new EventEmitter();
  }

  public licenseCheck(): void {
    this.events.emit(this.eventNames.licenseCheck);
  }

  public passwordCheck(): void {
    this.events.emit(this.eventNames.passwordCheck);
  }

  public timeSyncCheck(): void {
    this.events.emit(this.eventNames.timeSyncCheck);
  }

  public startTimePolling(): void {
    this.events.emit(this.eventNames.startTimePolling);
  }

  public stopTimePolling(): void {
    this.events.emit(this.eventNames.stopTimePolling);
  }
}

export default new Events();
