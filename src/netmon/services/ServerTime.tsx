import * as React from 'react';
import HTTP from '../common/http';

const TIME_URI: string = '/api/system/time';

const CLOCK_SUCCESS_THRESHOLD_MS: number = 5000;

export default class ServerTime {
  private HTTP: HTTP;

  constructor($state?: any) {
    this.HTTP = new HTTP($state);
  }

  public fetchServerTime() {
    return this.HTTP.fetch(TIME_URI);
  }

  public nsync(timeDelta: number): boolean {
    return timeDelta < CLOCK_SUCCESS_THRESHOLD_MS;
  }

  public makeTimeMessageReact(
    clientServerTimeMargin: number,
    clientServerTimeDiff: number,
    appendLinkToMessage?: boolean
  ): React.ReactNode {
    const clockDiffMessage = this.getClockDiffMessage(Math.abs(clientServerTimeDiff));
    const aheadBehindMessage = this.getClockAheadBehindMessage(clientServerTimeDiff);

    const msg = (
      <>
        Browser is {clockDiffMessage} {aheadBehindMessage} server. Margin of error is &#177;{' '}
        {clientServerTimeMargin} ms.
      </>
    );
    let link: React.ReactNode = null;
    if (appendLinkToMessage) {
      link = (
        <>
          {' '}
          Please update your NTP settings on the{' '}
          <a href="/configuration/ntp" className="alert-link">
            NTP Configuration
          </a>{' '}
          page.
        </>
      );
    }
    return (
      <>
        {msg}
        {link}
      </>
    );
  }

  public makeTimeMessage(
    clientServerTimeMargin: number,
    clientServerTimeDiff: number,
    appendLinkToMessage?: boolean
  ): string {
    let clockDiffMessage: string = this.getClockDiffMessage(Math.abs(clientServerTimeDiff));
    let aheadBehindMessage: string = this.getClockAheadBehindMessage(clientServerTimeDiff);
    const PLUS_MINUS_SIGN: string = '&#177;';

    let msg: string = `Browser is ${clockDiffMessage} ${aheadBehindMessage} server.
          Margin of error is ${PLUS_MINUS_SIGN} ${clientServerTimeMargin} ms.`;
    if (appendLinkToMessage) {
      msg +=
        ' Please update your NTP settings on the <a href="/configuration/ntp" class="alert-link">NTP Configuration</a> page.';
    }
    return msg;
  }

  private getClockAheadBehindMessage(clientServerTimeDiff: number): string {
    return clientServerTimeDiff >= 0 ? 'ahead of' : 'behind';
  }

  private getClockDiffMessage(clientServerTimeDelta: number): string {
    let message: string = '';
    let leftoverMs: number = clientServerTimeDelta;

    const MS_IN_YEAR: number = 31536000000;
    const MS_IN_DAY: number = 86400000;
    const MS_IN_HOUR: number = 3600000;
    const MS_IN_MINUTE: number = 60000;
    const MS_IN_SECOND: number = 1000;

    let years: number = Math.floor(leftoverMs / MS_IN_YEAR);
    leftoverMs = leftoverMs % MS_IN_YEAR;

    let days: number = Math.floor(leftoverMs / MS_IN_DAY);
    leftoverMs = leftoverMs % MS_IN_DAY;

    let hours: number = Math.floor(leftoverMs / MS_IN_HOUR);
    leftoverMs = leftoverMs % MS_IN_HOUR;

    let minutes: number = Math.floor(leftoverMs / MS_IN_MINUTE);
    leftoverMs = leftoverMs % MS_IN_MINUTE;

    let seconds: number = Math.floor(leftoverMs / MS_IN_SECOND);
    leftoverMs = leftoverMs % MS_IN_SECOND;

    let unit: string;

    if (years) {
      unit = years > 1 ? ' years, ' : ' year, ';
      message += years + unit;
    }
    if (days) {
      unit = days > 1 ? ' days, ' : ' day, ';
      message += days + unit;
    }
    if (hours) {
      unit = hours > 1 ? ' hours, ' : ' hour, ';
      message += hours + unit;
    }
    if (minutes) {
      message += minutes + ' min, ';
    }
    if (seconds) {
      message += seconds + ' sec, ';
    }

    message += leftoverMs + ' ms';

    return message;
  }
}
