import { PulseChannel } from './channel';

export const CLUSTER_UUID = '123';
export const BASE_URL = 'http://localhost:5601/api/pulse_poc';
export interface ChannelsToSend {
  records: any;
  channel_id: string;
}

export type Fetcher<Response> = (url: string, channelsToSend: ChannelsToSend[]) => Promise<Response>

export async function sendPulse<Response>(channels: Map<string, PulseChannel>, fetcher: Fetcher<Response>) {
  const url = `${BASE_URL}/intake/${CLUSTER_UUID}`;

  const channelsToSend = [];
  for (const channel of channels.values()) {
    const records = await channel.getRecords();
    channelsToSend.push({
      records,
      channel_id: channel.id,
    });
  }

  let response: any;
  try {
    response = await fetcher(url, channelsToSend);
  } catch (err) {
    if (!err.message.includes('ECONNREFUSED')) {
      throw err;
    }
    // the instructions polling should handle logging for this case, yay for POCs
    return;
  }
  if (response.status === 503) {
    // the instructions polling should handle logging for this case, yay for POCs
    return;
  }

  if (response.status !== 200) {
    const responseBody = await response.text();
    throw new Error(`${response.status}: ${responseBody}`);
  }
}
