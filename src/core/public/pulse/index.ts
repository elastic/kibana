import { InstructionsResponse } from '../../server/pulse';
import { PulseChannel, PulseInstruction } from '../../server/pulse/channel';
import { Fetcher, sendPulse } from '../../server/pulse/send_pulse';
import { CoreContext } from '../core_system';
import { Subject } from 'rxjs';

export interface PulseServiceSetup {
  getChannel: (id: string) => PulseChannel;
}

export interface PulseServiceStart {

}


// import { PulseChannel, PulseInstruction } from '../../server/pulse';

const channelNames = [
  'default',
  'notifications',
];

export class PulseService {
  private retriableErrors = 0;
  private readonly channels: Map<string, PulseChannel>;
  private readonly instructions: Map<string, Subject<any>> = new Map();

  constructor(coreContext: CoreContext) {
    this.channels = new Map(
      channelNames.map((id): [string, PulseChannel] => {
        const instructions$ = new Subject<PulseInstruction>();
        this.instructions.set(id, instructions$);
        const channel = new PulseChannel({ id, instructions$ });
        return [channel.id, channel];
      })
    );
  }

  public async setup(): Promise<PulseServiceSetup> {
    // poll for instructions every second for this deployment
    setInterval(() => {
      // eslint-disable-next-line no-console
      this.loadInstructions().catch(err => console.error(err.stack));
    }, 10000);

    // eslint-disable-next-line no-console
    console.log('Will attempt first telemetry collection in 5 seconds...');
    setTimeout(() => {
      setInterval(() => {
        // eslint-disable-next-line no-console
        this.sendTelemetry().catch(err => console.error(err.stack));
      }, 5000);
    }, 5000);

    return {
      getChannel: (id: string) => {
        const channel = this.channels.get(id);
        if (!channel) {
          throw new Error(`Unknown channel: ${id}`);
        }
        return channel;
      },
    };
  }

  private async sendTelemetry() {
    const fetcher: Fetcher<Response> = async (url, channels) => {
      return await fetch(url, {
        method: 'post',

        headers: {
          'content-type': 'application/json',
          'kbn-xsrf': 'true',
        },
        body: JSON.stringify({
          channels,
        }),
      })
    }

    return await sendPulse(this.channels, fetcher);
  }

  private async loadInstructions() {
    const url = 'http://localhost:5601/api/pulse_poc/instructions/123';
    let response: any;
    try {
      response = await fetch(url);
    } catch (err) {
      if (!err.message.includes('ECONNREFUSED')) {
        throw err;
      }
      this.handleRetriableError();
      return;
    }
    if (response.status === 503) {
      this.handleRetriableError();
      return;
    }

    if (response.status !== 200) {
      const responseBody = await response.text();
      throw new Error(`${response.status}: ${responseBody}`);
    }

    const responseBody: InstructionsResponse = await response.json();

    responseBody.channels.forEach(channel => {
      const instructions$ = this.instructions.get(channel.id);
      if (!instructions$) {
        throw new Error(
          `Channel (${channel.id}) from service has no corresponding channel handler in client`
        );
      }

      channel.instructions.forEach(instruction => instructions$.next(instruction));
    });
  }

  private handleRetriableError() {
    this.retriableErrors++;
    if (this.retriableErrors === 1) {
      // eslint-disable-next-line no-console
      console.warn(
        'Kibana is not yet available at http://localhost:5601/api, will continue to check for the next 120 seconds...'
      );
    } else if (this.retriableErrors > 120) {
      this.retriableErrors = 0;
    }
  }

  async start(): Promise<PulseServiceStart> {
    return {
    }
  }
  public stop() {
    // nothing to do here currently
  }
}
